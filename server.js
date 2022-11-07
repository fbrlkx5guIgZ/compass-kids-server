import express from 'express'
import mysql from 'mysql2/promise'
import https from 'https'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { expressjwt } from 'express-jwt'
import jwt from 'jsonwebtoken'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const options = {
    key: fs.readFileSync(path.resolve('keys/compass-kids.com.key'), 'utf-8'),
    cert: fs.readFileSync(path.resolve('keys/compass-kids.com_bundle.crt'), 'utf-8')
}
const secretKey = 'REDACTED_JWT_SECRET'

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
app.use(expressjwt({
    secret: secretKey,
    algorithms: ['HS256']
}).unless({
    path: ['/login', '/Vapp/User/regUserAction', '/Vapp/User/resetUserAction']
}))

app.get('/login', async (req, res) => {//可以靠两种验证登录，返回一个token
    let data = {}

    //高级权限
    const code = req.query.code
    if (req.query.code) {
        data = (await db.query('select * from users where ?', { code }))[0]
    }

    //低级权限，账号密码
    else {
        const passwd = req.query.passwd
        delete req.query.passwd
        const login = {}
        const login_key = Object.keys(req.query)[0]
        login[login_key] = req.query[login_key]
        data = (await db.query('select * from users where ? and ?', [{ passwd }, login]))[0]
    }


    if (data) {
        const token = jwt.sign(data.id, secretKey)
        res.send(token)
    }
    else {
        req.statusCode = 404
        res.send('没有这样的用户哦！')
    }
})

app.get('/Vapp/User/regUserAction', async (req, res) => {//新用户注册
    let data = ''
    await db.query('insert into users set ?', req.query).catch((err) => {
        res.statusCode = 400
        data = err
    })
    res.send(data)
})

app.get('/Vapp/User/resetUserAction', async (req, res) => {//更新用户信息，要求是通过高级验证
    const code = req.query.code
    delete req.query.code
    const data = (await db.query('select id from users where ?', { code }))[0]
    const id = _.get(data, '0.id')
    if (id) {
        let data = ''
        await db.query('update users set ? where ?', [req.query, { id }]).catch((err) => {
            res.statusCode = 400
            data = err
        })
        res.send(data)
    }
    else {
        res.statusCode = 401
        res.send('注册码无效！')
    }
})

app.get('/Vapp/Lesson/getStartLessonList', async (req, res) => {
    const token = _.get(req, 'query.token', 'sharePage')
    // console.log(where[token])

    const pre_datalist = (await db.query(`select * from ${req.table} ${where[token]}`))[0]
    const datalist = jsonfy(pre_datalist)
    // res.send({ datalist, status: 200 })
    res.send({ datalist: [], status: 200 })
})

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

app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send('invalid token')
    }
})

const httpsServer = https.createServer(options, app)
httpsServer.listen(443)
// httpsServer.listen(80)