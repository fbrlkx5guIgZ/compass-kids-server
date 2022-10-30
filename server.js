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
    admin:'where classgroupid and lessonname like "G%"',
    '1Hb(8NL/x6':'where classgroupid and lessonname like "G2A%" and lessonname like "%Dinosaur%"',
    '50wNp>&%EE':'where classgroupid and lessonname like "G2A%" and lessonname like "%Dinosaur%"',
    '8nT-U/l62l':'where classgroupid and lessonname="G1B-My Thursday Routine" or lessonname="G1B-A Training Schedule"',
    'h)B50*3&Hg':'where classgroupid and lessonname="G1B-My Thursday Routine" or lessonname="G1B-A Training Schedule"',
    'sharePage': 'where lessonname="null"'
}

app.use(express.urlencoded({ extended: false }))
app.use((req, res, next) => {
    req.table = req.path.split('/').filter(value => value).join('_')
    next()
})

const token_check = (req, res, next) => {
    if (req.query.token) {
        next()
    }
    else {
        res.statusCode = 403
        res.send('登录查看您课程计划中的课程')
    }
}

// app.get('/', (req, res) => {
//     // res.send('我爱杨宝~~')
//     res.send('首页')
// })

app.get('/Vapp/User/regUserAction', (req, res) => {
    res.send(req.query.code)
})

app.get('/Vapp/Lesson/getStartLessonList', token_check)
app.get('/Vapp/Lesson/getStartLessonList', async (req, res) => {
    const pre_datalist = (await db.query(`select * from ${req.table} ${where}`))[0]
    const datalist = jsonfy(pre_datalist)
    // res.send({ datalist, status: 200 })
})

app.get('/Vapp/Lesson/getEndLessonList', token_check)
app.get('/Vapp/Lesson/getEndLessonList', async (req, res) => {
    const thistoken = _.get(req, 'query.token', 'sharePage')
    const page = /^\d+$/.test(_.get(req, 'query.page')) ? req.query.page : 1
    // const pre_datalist = (await db.query(`select * from ${req.table} ${where} order by classlevel+0 asc,lessonid asc limit ${(page - 1) * 10},10`))[0]
    const pre_datalist = (await db.query(`select * from ${req.table} ${where[thistoken]} order by classlevel+0 asc,lessonid asc limit ${(page - 1) * 10},10`))[0]
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