import fs from 'fs'
import mysql from 'mysql2/promise'

const table = 'vapp_prereview_getprereviewresource'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const code = 'admin'
const json = (await db.query(`select id from users where ?;`, { code }))[0]
// const stream = fs.createWriteStream('video_G1_series.txt', 'utf-8')
const res = json.map((value, index) => {
    const part1 = (JSON.parse(value.partList) || [{ url: undefined }])[0]
    stream.write((part1.url || index) + '\n')

    return part1
})