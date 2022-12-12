import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import path from 'path'
import COS from 'cos-nodejs-sdk-v5'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const cos = new COS({
    SecretId: 'REDACTED_TENCENT_SECRET_ID',
    SecretKey: 'REDACTED_TENCENT_SECRET_KEY'
});

const list_file = fs.createWriteStream(path.resolve('static', 'videos.txt'))
await new Promise((resolve, reject) => {
    list_file.on('ready', resolve)
})

const ls = fs.readdirSync(path.resolve('static'))
const json = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource;'))[0]

for (const item of json) {
    const part_list = JSON.parse(item.partList)
    const id = item.id
    for (let index = 0; index < part_list.length; index++) {
        const part = part_list[index]
        if (part.url) {
            const file = decodeURI(part.url.match(/[^/]+$/)[0])
            if (!file.includes('.')) {
                part.url = part.url + '.mp4'
                const partList = JSON.stringify(part_list)
                await db.query('update vapp_prereview_getprereviewresource set ? where ?', [{ partList }, { id }])
                console.log([item.id, part.title])
            }
        }
    }
}
db.end()