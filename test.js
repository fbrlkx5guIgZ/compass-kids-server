import fs from 'fs'
import mysql from 'mysql2/promise'

const getendlessonlist = 'vapp_lesson_getendlessonlist'
const getprereviewresource = 'vapp_prereview_getprereviewresource'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

// const code = 'admin'
// const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like "L%" order by classlevel,lessonid;'))[0]
// const stream = fs.createWriteStream('video_L_series.txt', 'utf-8')
// for (const item of json) {
//     stream.write(item.lessonname)
//     const id = item.lessonid
//     const [part1, part2] = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource where id like ?;', id + '%'))[0]
//     let partList = (JSON.parse(part1.partList) || [{ url: undefined }])[0]
//     stream.write(partList.url ? '\r\n' + partList.title + '\n' + partList.url : '')
//     partList = (JSON.parse(part2.partList) || [{ url: undefined }])[0]
//     stream.write(partList.url ? '\r\n' + partList.title + '\n' + partList.url + '\n\n' : '\n\n')
// }
const json = (await db.query('SELECT * FROM userlesson right join compass_kids.vapp_lesson_getendlessonlist on userlesson.lessonid=vapp_lesson_getendlessonlist.lessonid and uid=0;'))[0]
db.end()