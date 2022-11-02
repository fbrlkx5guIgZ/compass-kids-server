import express, { json } from 'express'
import mysql from 'mysql2/promise'
import https from 'https'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { expressjwt } from 'express-jwt'
import jwt from 'jsonwebtoken'

const db = mysql.createPool({
    host: 'www.compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const options = {
    key: fs.readFileSync(path.resolve('keys/compass-kids.com.key'), 'utf-8'),
    cert: fs.readFileSync(path.resolve('keys/compass-kids.com_bundle.crt'), 'utf-8')
}
const secretKey = ''

const app = express()
const jsonfy = (json_array) => {
    if (Array.isArray(json_array)) {
        json_array.forEach(json_like => {
            for (const key of Object.keys(json_like)) {
                try {
                    json_like[key] = JSON.parse(json_like[key])
                } catch (error) {
                }
            }
        })
        if (json_array.length == 1) {
            return json_array[0]
        }
        else {
            return json_array
        }
    }
}

const where = {
    admin: 'where classgroupid and lessonname like "G%"',
    '1Hb(8NL/x6': "where lessonid='923767' or lessonid='923768'",
    '50wNp>&%EE': "where lessonid='923767' or lessonid='923768'",
    '8nT-U/l62l': 'where lessonid=816556 or lessonid=816557',
    'h)B50*3&Hg': 'where lessonid=816556 or lessonid=816557',
    'Oj@P!eD70kNk': 'where lessonid >= 1010225 and lessonid <= 1010228',
    '1)G*1hbKUR07': 'where lessonid >= 1010225 and lessonid <= 1010228',

    'sharePage': 'where false',
}

app.use(express.urlencoded({ extended: false }))
app.use((req, res, next) => {
    req.table = req.path.split('/').filter(value => value).join('_')
    next()
})
app.use(expressjwt().unless({
    path: []
}))

const token_check = (req, res, next) => {
    const token = req.query.token
    console.log(token + '\n')
    if (where[token]) {
        next()
    }
    else {
        res.statusCode = 403
        res.send('登录查看您课程计划中的课程')
    }
}

app.get('login', async (req, res) => {
    const passwd = req.query.passwd
    delete req.query.passwd

    const id = (await db.query(`select * from users where ${Object.keys(req.query)[0]}=${req.query[Object.keys(req.query)[0]]} and passwd=${passwd}`))[0]
    if (id) {
        const token = jwt.sign(id, secretKey)
        res.send(token)
    }
    else{
        req.statusCode = 404
        res.send('没有这样的用户哦！')
    }
})

app.get('/Vapp/User/regUserAction', async (req, res) => {
    const code = req.query.code
    if (where[code]) {
        res.send(req.query.code)
    }
    else {
        res.statusCode = 403
        res.send('没有这个注册码！')
    }
})

app.get('/Vapp/Lesson/getStartLessonList', token_check)
app.get('/Vapp/Lesson/getStartLessonList', async (req, res) => {
    const token = _.get(req, 'query.token', 'sharePage')
    // console.log(where[token])

    const pre_datalist = (await db.query(`select * from ${req.table} ${where[token]}`))[0]
    const datalist = jsonfy(pre_datalist)
    // res.send({ datalist, status: 200 })
    res.send({ datalist: [], status: 200 })
})

app.get('/Vapp/Lesson/getEndLessonList', token_check)
app.get('/Vapp/Lesson/getEndLessonList', async (req, res) => {
    const token = _.get(req, 'query.token', 'sharePage')
    // console.log(where[token])

    const page = /^\d+$/.test(_.get(req, 'query.page')) ? req.query.page : 1
    // const pre_datalist = (await db.query(`select * from ${req.table} ${where} order by classlevel+0 asc,lessonid asc limit ${(page - 1) * 10},10`))[0]
    const pre_datalist = (await db.query(`select * from ${req.table} ${where[token]} order by classlevel+0 desc, lessonid desc limit ${(page - 1) * 10},10`))[0]
    const datalist = jsonfy(pre_datalist)
    res.send({ datalist, status: 200 })
})

app.get('/Vapp/Lesson/getEndLessonCmpflg', async (req, res) => {
    const page = /^\d+$/.test(_.get(req, 'query.page')) ? req.query.page : 1
    const pre_datalist = (await db.query(`select * from ${req.table} order by lessonid asc limit ${(page - 1) * 10},10`))[0]
    const datalist = jsonfy(pre_datalist)
    res.send({ datalist, status: 200, intenum: '4' })
})

app.post('/Vapp/Prereview/getPrereviewResource', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${/^\d+$/.test(_.get(req, 'body.lessonid')) ? req.body.lessonid : 0}${/^\d+$/.test(_.get(req, 'body.lessontype')) ? req.body.lessontype : 0}`))[0]
    res.send(jsonfy(single_array))
})

app.post('/Vapp/Lesson/getLessonBook', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${/^\d+$/.test(_.get(req, 'body.classid')) ? req.body.classid : 0}`))[0]
    res.send(jsonfy(single_array))
})

app.post('/Vapp/Book/getBookSource', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${/^\d+$/.test(_.get(req, 'body.bookid')) ? req.body.bookid : 0}`))[0]
    res.send(jsonfy(single_array))
})

// app.post('/Vapp/Book/getBookSource', async (req, res) => {
//     const single_array = (await db.query(`select * from ${req.table} where id<${/^\d+$/.test(_.get(req, 'body.bookid')) ? req.body.bookid : 0} order by id desc limit 1`))[0]
//     res.send(jsonfy(single_array))
// })

app.post('/Vapp/Challenge/getExamPart', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${/^\d+$/.test(_.get(req, 'body.part_id')) ? req.body.part_id : 0}`))[0]
    res.send(jsonfy(single_array))
})

app.get('/Vapp/Lesson/getEndLesson', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${/^\d+$/.test(_.get(req, 'query.lessonid')) ? req.query.lessonid : 0}`))[0]
    res.send(jsonfy(single_array))
})

app.post('/book/Book/addReadingAction', (req, res) => {
    res.send({ code: 200 })
})

app.post('/Vapp/Book/isCollection', (req, res) => {
    res.send({ code: 200 })
})

app.get('/Vapp/Prereview/addPrereviewLock', (req, res) => {
    res.send({ code: 200 })
})

app.get('/Vapp/index/getIndexData', (req, res) => {
    res.sendFile(path.resolve('Vapp/index/getIndexData' + '.json'))
})

app.get('/Vapp/User/userBindAction', (req, res) => {
    res.sendFile(path.resolve('Vapp/User/userBindAction' + '.json'))
})

app.get('/Vapp/User/refreshUserAction', (req, res) => {
    res.sendFile(path.resolve('Vapp/User/refreshUserAction' + '.json'))
})

app.use(express.static(path.resolve('static')))
app.use(express.static(path.resolve()))

const httpsServer = https.createServer(options, app)
httpsServer.listen(443)