import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import xlsx from 'xlsx'
import path from 'path'

const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'compass_kids'
})

const excel = xlsx.readFile(path.resolve('课件英语排序_ver06.xlsx'))

const pattern = (title) => {
    let p1, p2, p3
    try {
        [, p1, p2, p3] = title.match(/^([^-]+?-)(\d+-)?(.+?)$/)
    } catch (error) {
        // console.log(error)
    }
    return [p1 + p2 + '%', '%-' + p3]
}

let single_array = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist;'))[0]

for (let classlevel = 1; classlevel <= excel.SheetNames.length; classlevel++) {
    const sheetName = excel.SheetNames[classlevel - 1];
    const sheet_json = xlsx.utils.sheet_to_json(excel.Sheets[sheetName])

    // const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like "K3%" order by classlevel+0,lessonno+0;'))[0]
    for (const item of sheet_json) {
        const [pattern1, pattern2] = [pattern(item['名称']), pattern(item['备注'])]
        const lessonname = item['名称']
        const lessonno = item['序号']
        
        if (single_array.length > 1) {
            pattern1[0] = undefined
            pattern2[0] = undefined
            single_array = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where classlevel!=0 and (lessonname like ? or lessonname like ? or lessonname like ? or lessonname like ?);', [pattern1, pattern2].flat(1)))[0]
        }

        if (single_array.length == 0) {
            if (item['备注'] || lessonname) {
                console.log(['not match', lessonname, item['备注']])
                // console.log(lessonname)
            }
            continue
        }
        else if (single_array.length > 1) {
            console.log(['multi match'].concat([pattern1, pattern2], single_array.map(item => item.lessonname)))
        }
        // console.log(list_raw[index])
        const lessonid = single_array[0].lessonid || 0

        // console.log(lessonid)
        // await db.query('update vapp_lesson_getendlessonlist set ? where ? and classlevel=0', [{ lessonname, lessonno, classlevel }, { lessonid }])
        await db.query('update vapp_lesson_getendlessonlist set ? where ? and classlevel!=0', [{ lessonname, lessonno, classlevel }, { lessonid }])
    }

}
db.end()
