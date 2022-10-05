import mysql from 'mysql2'
const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const db_callback = (affectedRows) => {
    return new Function('err', 'result', `
        if (err) {
            console.log('err: ' + err.message)
        }
        else{
            console.log(result.affectedRows == ${affectedRows})
        }
    `)
}
db.query('select 1 where not exists(SELECT * FROM information_schema.tables where table_name="my_table")', (err, result) => {
    if (err) {
        console.log(err)
    }
    console.log(result)
})