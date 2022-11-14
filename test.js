import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import xlsx from 'xlsx'
import path from 'path'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const ls = fs.readdirSync(path.resolve('static'))
for (const file of ls) {
    const new_file = file.replace(/^([^ .]+)/, '$1.mp4')
    if (!new_file == file) {
        console.log(new_file, file)
        fs.rename(path.resolve('static', file), path.resolve('static', new_file), () => { })
    }
}