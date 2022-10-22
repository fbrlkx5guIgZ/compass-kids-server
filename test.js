import express from 'express'
import mysql from 'mysql2/promise'
import https from 'https'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'

const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})
const options = {
    key: fs.readFileSync(path.resolve('keys/compass-kids.com.key'), 'utf-8'),
    cert: fs.readFileSync(path.resolve('keys/compass-kids.com_bundle.crt'), 'utf-8')
}

const app = express()
const httpsServer = https.createServer(options, app)
httpsServer.listen(443, () => { })