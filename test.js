import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import path from 'path'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const ls = fs.readdirSync(path.resolve('static'))
const json = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource;'))[0]
for (const item of json) {
    const partList = JSON.parse(item.partList)
    for (const part of partList) {
        if (part.url) {
            const file = part.url.match(/[^/]+$/)[0]
            // if (part.title.match(/拓展视频|动漫歌曲|动漫故事|故事预热/)) {
            if (!ls.includes(file)) {
                console.log(part.title, [part.url, file])
            }
        }
    }
}
db.end()