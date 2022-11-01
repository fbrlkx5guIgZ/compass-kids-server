import mysql from 'mysql2/promise'

const db = mysql.createPool({
    host: 'www.compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

await db.query(`alter table vapp_book_getbooksource add primary key(id);`).catch((err) => {
    console.log(err.sqlMessage)
})

const json = (await db.query(`select * from vapp_book_getbooksource`))[0]
for (const item of json) {
    console.log(item.id)
    const data = JSON.parse(item.data || '{}')
    for (const key of Object.keys(data)) {
        const exists = await db.query(`SELECT * FROM information_schema.columns where table_name='vapp_book_getbooksource' and column_name='${key}'`)
        if (!exists[0].length) {
            if (typeof data[key] == 'number') {
                await db.query(`alter table vapp_book_getbooksource add \`${key}\` int`)
            }
            else if (typeof data[key] == 'string') {
                await db.query(`alter table vapp_book_getbooksource add \`${key}\` text`)
            }
            else {
                await db.query(`alter table vapp_book_getbooksource add \`${key}\` text`)
            }
        }
        if (typeof data[key] != 'number' && typeof data[key] != 'string' && data[key] != null) {
            data[key] = JSON.stringify(data[key])
        }
        else if (typeof data[key] == 'string') {
            data[key] = data[key]
        }
        item[key] = data[key]

    }
    delete item.data, item.code, item.error
    await db.query(`replace into vapp_book_getbooksource set ?`, item).catch((err) => {
        console.log(err.sqlMessage)
        // console.log(err)
        // throw err
    })
}

db.query(`alter table vapp_book_getbooksource drop column data,drop column code,drop column error;`)