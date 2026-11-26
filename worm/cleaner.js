import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import path from 'path'

const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'compass_kids'
})

const ls = fs.readdirSync(path.resolve('static'))
for (const file of ls) {
    const name = `%${file}%`
    const json = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource where partList like ?;', name))[0]
    if (!json.length) {
        console.log('no ' + file)
    }
    else {
        const partList = JSON.parse(json[0].partList)
        for (const part of partList) {
            if (part.title.match(/拓展视频|动漫歌曲|动漫故事|故事预热/)) {
                console.log(part.title, part.url)
            }
        }
    }
}

db.end()
