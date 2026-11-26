import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'

const getendlessonlist = 'vapp_lesson_getendlessonlist'
const getprereviewresource = 'vapp_prereview_getprereviewresource'

const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'compass_kids'
})

const code = 'admin'
const list_raw = []
const list_new = []
const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist left join _vapp_prereview_getprereviewresource on lessonid=cast(id/10 as unsigned) where lessonname like "k3%" order by lessonno+0 desc;'))[0]
const stream = fs.createWriteStream('video_K3_series.txt', 'utf-8')
for (const item of json) {
    // stream.write('\n' + item.lessonname)
    let partList = JSON.parse(item.partList) || [{}]
    for (const part of partList) {
        stream.write(part.url ? '\n' + part.url : '')
        console.log(part.url)
        part.url
    }

    const part = partList[1]
    stream.write(part.url ? '\n' + part.url : '')
}

db.end()
