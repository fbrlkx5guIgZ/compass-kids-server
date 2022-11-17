import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import xlsx from 'xlsx'
import path from 'path'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const genEnCode = (length, hasNum, hasChar, hasSymbol, caseSense, lowerCase) => {
    var m = "";
    if (hasNum == "0" && hasChar == "0" && hasSymbol == "0") return m;
    for (var i = length; i >= 0; i--) {
        var num = Math.floor((Math.random() * 94) + 33);
        if (
            (
                (hasNum == "0") && ((num >= 48) && (num <= 57))
            ) || (
                (hasChar == "0") && ((
                    (num >= 65) && (num <= 90)
                ) || (
                        (num >= 97) && (num <= 122)
                    ))
            ) || (
                (hasSymbol == "0") && ((
                    (num >= 33) && (num <= 47)
                ) || (
                        (num >= 58) && (num <= 64)
                    ) || (
                        (num >= 91) && (num <= 96)
                    ) || (
                        (num >= 123) && (num <= 127)
                    ))
            )
        ) {
            i++;
            continue;
        }
        m += String.fromCharCode(num);
    }
    if (caseSense == "0") {
        m = (lowerCase == "0") ? m.toUpperCase() : m.toLowerCase();
    }
    return m
}

const excel = xlsx.readFile(path.resolve('Compass-登记课表_ver01.xlsx'))

const sheetName = excel.SheetNames[0];
const sheet_json = xlsx.utils.sheet_to_json(excel.Sheets[sheetName])

// const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like "K3%" order by classlevel+0,lessonno+0;'))[0]
for (const item of sheet_json) {
    let grade, remark, names = [], ids = []
    try {
        grade = item['Grade'].match(/\w+/g)[0] + '%'
        names = item['Grade'].match(/\w+/g).slice(1)
        remark = item['Remark'].match(/(?<=\d\.).+?(?=  |$)/g).map(title => `%${title.trim()}%`)
    } catch (error) {
        // console.log('skip', [item['Grade'], remark])
        continue
    }
    for (const name of names) {
        const code = genEnCode(11, 1, 1, 1)
        await db.query('insert into users set ?', { code, name })
        const { id } = (await db.query('select * from users where ?', { code }))[0][0]
        ids.push(id)
    }

    let startdate = new Date(item['start_date'])
    startdate.setDate(startdate.getDate() - (startdate.getDay() - 1)) //转到这周周一
    const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like ? and lessonname like ?;', [grade, remark[0]]))[0]
    if (json.length == 1) {
        const { classlevel, lessonno } = json[0]
        const lessonlist = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where ? and lessonno+0 >= ? order by lessonno+0;', [{ classlevel }, lessonno]))[0]
        let starttime = startdate.getTime().toString().slice(0, -3)
        // console.log(starttime)
        for (let index = 0, times = 0; index < lessonlist.length; index++, times = (times + 1) % remark.length) {
            const { lessonid } = lessonlist[index];
            if (!times && index) {
                startdate.setDate(startdate.getDate() + 7)
                starttime = startdate.getTime().toString().slice(0, -3)
                // console.log(starttime)
            }
            for (const id of ids) {
                db.query('insert into userlesson set ?', { lessonid, starttime, id })
            }
        }
    }
    else if (!json.length) {
        console.log('not match', [grade, remark[0]])
    }
    else {
        console.log('multi match', [grade, remark[0]])
    }
}
db.end()