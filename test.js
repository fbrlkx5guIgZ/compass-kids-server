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
const json = (await db.query('SELECT * FROM vapp_challenge_getexampart where questions is null;'))[0]

for (const item of json) {
    try {
        const data = JSON.parse(item.data)
        for (const key in data) {
            if (Object.hasOwnProperty.call(data, key)) {
                const item = data[key];
                if (typeof item == 'object') {
                    data[key] = JSON.stringify(data[key])
                }
            }
        }
        const id = item.id
        await db.query('update vapp_challenge_getexampart set ? where ?', [data, { id }])
    } catch (error) {
        console.log(item.id, error)
    }
}
db.end()