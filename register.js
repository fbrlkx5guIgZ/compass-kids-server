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

const excel = xlsx.readFile(path.resolve('what2change.xlsx'))
const sheetName = excel.SheetNames[0];
const sheet_json = xlsx.utils.sheet_to_json(excel.Sheets[sheetName])

const drop_lessons = [998938, 998939, 998940, 998941, 1000952, 1000953, 1000954, 1000956, 1000957, 1005250]

// const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like "K3%" order by classlevel+0,lessonno+0;'))[0]
for (const item of sheet_json) {
    let grade, remark, names = [], ids = [], startdate
    try {
        grade = item['Grade'].match(/[^-&]+/g).map(value => value.trim().replace(' ', '')).filter(value => value)
        names = grade.slice(1)
        remark = item['Remark'].match(/(?<=\d\.).+?(?=  |$)/g).map(title => title.trim()).filter(value => value).map(title => `%${title}%`)
        startdate = new Date(item['跟新时间'].match(/[\d.]+/)[0])
        // startdate.setDate(startdate.getDate() - (startdate.getDay() - 1)) //转到这周周一
    } catch (error) {
        // console.log('skip', [item['Grade'], remark])
        continue
    }
    for (const name of names) {
        const code = genEnCode(11, 1, 1, 0)
        try {
            await db.query('insert into users set ?', { code, name })
        } catch (error) {
            // console.log(error)
            // continue
        }
        const { id } = (await db.query('select * from users where ?', { name }))[0][0]
        if (id == 1209) {
            // console.log(id)
        }
        ids.push(id)
    }

    const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like ? and lessonname like ?;', [grade[0] + '%', remark[0]]))[0]
    if (json.length == 1) {
        const { classlevel, lessonno } = json[0]
        const lessonlist = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where ? and lessonno >= ? or classlevel > ? order by classlevel, lessonno;', [{ classlevel }, lessonno, classlevel]))[0]
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
                const id_lessonid = `${id}_${lessonid}`
                await db.query('insert into userlesson set ? on duplicate key update ?', [{ lessonid, starttime, id, id_lessonid }, { lessonid, starttime, id, id_lessonid }])
                console.log([starttime, id_lessonid])
            }
        }
    }
    else if (!json.length) {
        console.log('not match', [grade[0], remark[0]])
    }
    else {
        console.log('multi match', [grade[0], remark[0]])
    }
}

await db.query(`delete from userlesson where lessonid = ${drop_lessons.join(' or lessonid = ')}`)
db.end()