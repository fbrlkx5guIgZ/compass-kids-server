import fs, { realpathSync } from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import xlsx from 'xlsx'
import path from 'path'

const getendlessonlist = 'vapp_lesson_getendlessonlist'
const getprereviewresource = 'vapp_prereview_getprereviewresource'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const text = await db.query('SELECT * FROM compass_kids.__vapp_lesson_getendlessonlist where lessonname like ? order by classlevel+0,lessonno+0;','k2b%')
1