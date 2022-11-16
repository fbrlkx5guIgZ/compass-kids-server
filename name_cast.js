import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import xlsx from 'xlsx'
import path from 'path'

const sub_name = 'C:\\home\\Projects\\CompassKids\\local'
const offical_name = 'C:\\Users\\DuHeng\\Desktop\\raw\\k3'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const sub_ls = fs.readdirSync(path.resolve(sub_name))
const offical_ls = fs.readdirSync(path.resolve(offical_name))

for (let index = 0; index < sub_name.length; index++) {
    fs.rename(path.resolve(sub_name, sub_ls[index]), path.resolve(sub_name, offical_ls[index]), (err) => {
        if (err) {
            console.log(err)
        }
    })
    console.log(sub_ls[index], offical_ls[index])
}