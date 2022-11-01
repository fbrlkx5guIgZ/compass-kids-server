import mysql from 'mysql2/promise'

const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const { data } = await db.query(`select * from booksource limit 10`)
for (const key of Object.keys(data)) {
    const exists = await db.query(`SELECT * FROM information_schema.columns where table_name='booksource' and column_name='${key}'`)
    if (!exists[0].length) {
        if (typeof json[key] == 'number') {
            await db.query(`alter table ${table} add \`${key}\` int`)
        }
        else if (typeof json[key] == 'string') {
            await db.query(`alter table ${table} add \`${key}\` text`)
        }
        else {
            await db.query(`alter table ${table} add \`${key}\` text`)
        }
    }

    if (typeof json[key] != 'number' && typeof json[key] != 'string' && json[key] != null) {
        json[key] = JSON.stringify(json[key])
    }
    else if (typeof json[key] == 'string') {
        json[key] = json[key]
    }
}