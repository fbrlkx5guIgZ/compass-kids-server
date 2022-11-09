import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'

const getendlessonlist = 'vapp_lesson_getendlessonlist'
const getprereviewresource = 'vapp_prereview_getprereviewresource'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const code = 'admin'
const json = (await db.query('SELECT * FROM vapp_prereview_getprereviewresource'))[0]
// const stream = fs.createWriteStream('video_L_series.txt', 'utf-8')
for (const item of json) {
    // stream.write(item.lessonname)
    const id = item.id || 0
    let partList = (JSON.parse(item.partList) || [{ url: undefined }])[0]
    partList.url = _.get(partList, 'url.replace') ? partList.url.replace(/https?:\/\/.+?\//, 'https://www.compass-kids.com/') : ''
    partList = JSON.stringify(partList)
    console.log(id)
    await db.query('update vapp_prereview_getprereviewresource set ? where ?', [{ partList }, { id }])
    // stream.write(partList.url ? '\r\n' + partList.title + '\n' + partList.url : '')
    // partList = (JSON.parse(part2.partList) || [{ url: undefined }])[0]
    // stream.write(partList.url ? '\r\n' + partList.title + '\n' + partList.url + '\n\n' : '\n\n')
}

db.end()