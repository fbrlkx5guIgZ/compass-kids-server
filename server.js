import express from 'express'
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'

const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

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

app.use(express.urlencoded({ extended: false }))
app.use((req, res, next) => {
    req.table = req.path.split('/').filter(value => value).join('_')
    next()
})

app.get('/', (req, res) => {
    res.send('我爱杨宝~~')
})

app.get('/Vapp/Lesson/getStartLessonList', async (req, res) => {
    const pre_datalist = (await db.query(`select * from ${req.table}`))[0]
    const datalist = jsonfy(pre_datalist)
    res.send({ datalist, status: 200 })
})

app.get('/Vapp/Lesson/getEndLessonList', async (req, res) => {
    const page = req.query.page ? req.query.page : 1
    const pre_datalist = (await db.query(`select * from ${req.table} order by lessonid asc limit ${(page - 1) * 10},10`))[0]
    const datalist = jsonfy(pre_datalist)
    res.send({ datalist, status: 200 })
})

app.get('/Vapp/Lesson/getEndLessonCmpflg', async (req, res) => {
    const page = req.query.page ? req.query.page : 1
    const pre_datalist = (await db.query(`select * from ${req.table} order by lessonid asc limit ${(page - 1) * 10},10`))[0]
    const datalist = jsonfy(pre_datalist)
    res.send({ datalist, status: 200, intenum: '4' })
})

app.post('/Vapp/Prereview/getPrereviewResource', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${req.body.lessonid}${req.body.lessontype}`))[0]
    res.send(jsonfy(single_array))
})

app.post('/Vapp/Lesson/getLessonBook', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${req.body.classid}`))[0]
    res.send(jsonfy(single_array))
})

// app.post('/Vapp/Book/getBookSource', async (req, res) => {
//     const single_array = (await db.query(`select * from ${req.table} where id=${req.body.bookid}`))[0]
//     res.send(jsonfy(single_array))
// })

app.post('/Vapp/Book/getBookSource', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id<${req.body.bookid} order by id limit 1`))[0]
    res.send(jsonfy(single_array))
})

app.post('/Vapp/Challenge/getExamPart', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${req.body.part_id}`))[0]
    res.send(jsonfy(single_array))
})

app.get('/Vapp/Lesson/getEndLesson', async (req, res) => {
    const single_array = (await db.query(`select * from ${req.table} where id=${req.query.lessonid}`))[0]
    res.send(jsonfy(single_array))
})

app.post('/Vbook/Book/addReadingAction', (req, res) => {
    res.send({ code: 400 })
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

app.listen(80)