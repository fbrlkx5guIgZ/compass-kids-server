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

const list_file = fs.createWriteStream(path.resolve('static', 'videos.txt'))

const ls = fs.readdirSync(path.resolve('static'))
const json = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource;'))[0]
await new Promise((resolve, reject) => {
    list_file.on('ready', resolve)
})
for (const item of json) {
    const partList = JSON.parse(item.partList)
    for (const part of partList) {
        if (part.url) {
            const file = part.url.match(/[^/]+$/)[0]
            // if (part.title.match(/拓展视频|动漫歌曲|动漫故事|故事预热/)) {
            if (!ls.includes(file)) {
                // console.log(part.title, [part.url, file])
                list_file.write(part.url.replace(/www\.compass-kids\.com/,'cloud.nicekid.com'))
            }
        }
    }
}
db.end()