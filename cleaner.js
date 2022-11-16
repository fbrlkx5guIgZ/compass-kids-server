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
for (const file of ls) {
    const json = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource where partList like "%?%";', file))[0]
    if (!json.length) {
        console.log(file)
    }
}
db.end()