const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const _ = require('lodash');
const { expressjwt } = require('express-jwt');
const jwt = require('jsonwebtoken');


const pool = mysql.createPool({
    host: process.env.DB_HOST || '172.22.0.3',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'compass_kids',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000, // 设置连接超时时间为20秒
    // acquireTimeout: 20000  // 设置获取连接的超时时间为20秒
})

const secretKey = process.env.JWT_SECRET
if (!secretKey) {
    throw new Error('JWT_SECRET is required')
}
const LIMIT_DAY = 15

const parseToJSON = (json_array) => {
    if (Array.isArray(json_array)) {
        json_array.forEach(json_like => {
            for (const key of Object.keys(json_like)) {
                try {
                    json_like[key] = JSON.parse(json_like[key])
                } catch (error) {
                }
            }
        })
        // return json_array
        if (json_array.length == 1) {
            return json_array[0]
        }
        else {
            return json_array
        }
    }
}


const app = express()

app.disable('etag')

const allowedOrigins = new Set([
    'https://duqimeng.cn',
    'https://compass-kids.com',
    'https://www.compass-kids.com',
    'https://servicewechat.com'
])

app.use((req, res, next) => {
    const origin = req.get('origin')
    if (allowedOrigins.has(origin)) {
        res.set('Access-Control-Allow-Origin', origin)
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        res.set('Access-Control-Max-Age', '600')
        res.vary('Origin')
    }
    res.set('Cache-Control', 'no-store')

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
    }
    next()
})


app.use(express.urlencoded({ extended: false }))
app.use((req, res, next) => {
    req.table = req.path.split('/').filter(value => value).join('_').toLowerCase()
    next()
})
app.use(expressjwt({
    secret: secretKey,
    algorithms: ['HS256'],
    getToken(req) {
        return req.query.token || req.body.token
    }

}).unless({
    path: ['/', '/healthz', '/login', '/Vapp/User/regUserAction', '/Vapp/User/resetUserAction', '/Vapp/index/getIndexData']
}))

app.get('/', (req, res) => {
    // res.sendFile(path.resolve('static', 'index.html'))
    res.send('<p>这是 Compass-Kids 公司的主页！<p><a href="https://beian.miit.gov.cn/" target="_blank">沪ICP备2022030065号-1</a>')
})

app.get('/healthz', async (req, res) => {
    await pool.query('SELECT 1')
    res.send({ status: 'ok' })
})

app.get(/^(\/)*tingyu/, (req, res) => {
    res.sendFile(path.resolve('sideload/_.html'))
    // res.send('这是一个奇怪的主页！') 
})

app.get('/login', async (req, res) => {//可以靠两种验证登录，返回一个token
    let data = {}

    //高级权限
    const code = req.query.code
    if (req.query.code) {
        data = (await pool.query('select * from users where ?', { code }))[0]
    }

    //低级权限，账号密码
    else {
        const { user, phone, email, openid, passwd } = req.query
        const login = { user, phone, email, openid }
        Object.keys(login).map(key => {//删除空值
            if (!login[key] && Object.keys(login).length > 1) {
                delete login[key]
            }
        }).map(key => {//删除余值
            if (Object.keys(login).length > 1) {
                delete login[key]
            }
        })
        data = (await pool.query('select * from users where ? and ?', [{ passwd }, login]))[0]
    }
    try {
        const { id, admin } = data[0]

        if (id) {
            if (admin) {
                res.statusCode = 206
            }
            const token = jwt.sign({ id }, secretKey, { algorithm: 'HS256' })
            res.send(token)
        }
        else {
            res.statusCode = 404
            res.send('没有这样的用户哦！')
        }
    } catch (error) {
        res.statusCode = 404
        res.send('没有这样的用户哦！')
    }


})

app.get('/Vapp/User/getUserInfo', async (req, res) => {
    const [users] = await pool.query(
        'SELECT id, user, phone, email, name, admin FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1',
        [req.auth.id]
    )

    if (!users.length) {
        return res.status(404).send('没有这样的用户哦！')
    }

    res.send(users[0])
})

app.get('/Vapp/User/regUserAction', async (req, res) => {//新用户注册
    let data = ''
    delete req.query.token
    await pool.query('insert into users set ?', req.query).catch((err) => {
        res.statusCode = 400
        data = err
    })
    res.send(data)
})

app.get('/Vapp/User/resetUserAction', async (req, res) => {//更新用户信息，要求是通过高级验证
    delete req.query.token
    const code = req.query.code
    delete req.query.code
    const data = (await pool.query('select id from users where ?', { code }))[0]
    
    let id
    try {
        id = data[0]['id']
    } catch (error) { }
    if (id) {
        let data = ''
        await pool.query('update users set ? where ?', [req.query, { id }]).catch((err) => {
            res.statusCode = 400
            data = err
        })
        res.send(data)
    }
    else {
        res.statusCode = 401
        res.send('注册码无效')
    }
})

app.get('/Vapp/Lesson/getStartLessonList', async (req, res) => {
    const id = req.auth.id

    let page
    try {
        page = req.query.page.match(/\d+/)[0]
    } catch (error) { }
    if (!page > 0) {
        page = 1
    }
    const limit_time = (Date.now() + Date.UTC(1970, 0, LIMIT_DAY)).toString().slice(0, -3)
    const pre_datalist = (await pool.query('SELECT * FROM compass_kids.vapp_lesson_getStartLessonList right join userlesson on vapp_lesson_getStartLessonList.lessonid=userlesson.lessonid where userlesson.starttime < ? and ? order by classleve desc, vapp_lesson_getStartLessonList.lessonid desc limit ?,10;', [limit_time, { id }, (page - 1) * 10]))[0]
    const datalist = parseToJSON(pre_datalist)
    if (datalist.length) {
        res.send('')
        // res.send({ datalist, status: 200 })
    }
    else {
        res.statusCode = 404
        res.send('没有课程计划！')
    }
})

app.get('/Vapp/Lesson/getEndLessonList', async (req, res) => {
    const name = req.query.name
    let id = req.auth.id
    let limit_time = Date.now().toString().slice(0, -3)

    if (name) {
        const { admin } = (await pool.query('SELECT * FROM compass_kids.users where ?', { id }))[0][0]
        if (admin) {
            const user = (await pool.query('SELECT * FROM compass_kids.users where ?', { name }))[0]
            id = _.get(user, '0.id')
            if (!id) {
                res.statusCode = 404
                res.send('没有课程计划！')
                return
            }
            else {
                limit_time = (Date.now() + Date.UTC(1970, 0, LIMIT_DAY)).toString().slice(0, -3)
            }
        }
    }

    let page
    try {
        page = req.query.page.match(/\d+/)[0]
    } catch (error) { }
    if (!page > 0) {
        page = 1
    }

    req.query.searchString = req.query.searchString || ''
    const lessonname = '%' + req.query.searchString + '%'
    const pre_datalist = (await pool.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist right join userlesson on vapp_lesson_getendlessonlist.lessonid=userlesson.lessonid where lessonname like ? and userlesson.starttime < ? and ? and classlevel != 0 order by classlevel desc, vapp_lesson_getendlessonlist.lessonno desc limit ?,10;', [lessonname, limit_time, { id }, (page - 1) * 10]))[0]
    const datalist = pre_datalist
    if (datalist.length) {
        res.send({ datalist, status: 200 })
    }
    else {
        res.statusCode = 404
        res.send('没有课程计划！')
    }
})

app.get('/Vapp/Lesson/getEndLessonCmpflg', async (req, res) => {
    const page = /^\d+$/.test(_.get(req, 'query.page')) ? req.query.page : 1
    const pre_datalist = (await pool.query('select * from ' + req.table + ' order by lessonid asc limit ?,10', (page - 1) * 10))[0]
    const datalist = parseToJSON(pre_datalist)
    res.send({ datalist, status: 200, intenum: '4' })
})

app.post('/Vapp/Prereview/getPrereviewResource', async (req, res) => {
    const id = _.get(req, 'body.lessonid') + _.get(req, 'body.lessontype')
    // const single_array = (await db.query('select * from ' + req.table + ' where ?', { id }))[0]
    const uid = req.auth.id
    const single_array = (await pool.query('select * from vapp_prereview_getprereviewresource left join (userlesson left join userview on id_lessonid=left(uid_id,length(uid_id)-1)) on userview.id=vapp_prereview_getprereviewresource.id where vapp_prereview_getprereviewresource.id=? and userlesson.id=?;', [id, uid]))[0]
    res.send(parseToJSON(single_array))
})

app.post('/Vapp/Lesson/getLessonBook', async (req, res) => {
    const id = _.get(req, 'body.classid')
    // const single_array = (await db.query('select * from ' + req.table + ' where ?', { id }))[0]
    const single_array = {}
    res.send(parseToJSON(single_array))
})

app.post('/Vapp/Book/getBookSource', async (req, res) => {
    const id = _.get(req, 'body.bookid')
    const single_array = (await pool.query('select * from ' + req.table + ' where ?', { id }))[0]
    res.send(parseToJSON(single_array))
})

app.post('/Vapp/Challenge/getExamPart', async (req, res) => {
    const id = _.get(req, 'body.part_id')
    const single_array = (await pool.query('select * from ' + req.table + ' where ?', { id }))[0]
    res.send(parseToJSON(single_array))
})

app.get('/Vapp/Lesson/getEndLesson', async (req, res) => {
    const id = _.get(req, 'query.lessonid')
    const datalist = (await pool.query('select * from vapp_lesson_getendlessonlist where lessonid=?', id))[0]
    res.send(Object.assign({ "tabBarList": [{ "name": "预习AI课", "type": 1 }, { "name": "复习AI课", "type": 2 }], "tabBarList2": [{ "name": "基础关", "type": 1 }, { "name": "提升关", "type": 2 }] }, { id }, { datalist }))
})

app.post('/book/Book/addReadingAction', (req, res) => {
    res.send({ code: 200 })
})

app.post('/Vapp/Book/isCollection', (req, res) => {
    res.send({ code: 200 })
})

app.get('/Vapp/Prereview/addPrereviewLock', async (req, res) => {
    const uid = req.auth.id
    req.query.type = Number(req.query.type) || 1
    const id = req.query.lessonid + req.query.type
    const uid_id = uid + '_' + id
    const index = Number(req.query.lock) || 0

    const single_array = (await pool.query('select * from userview where ?', { uid_id }))[0]
    const old_index = _.get(single_array, '0.index') || 0
    if (old_index <= index) {
        // const lock = `[${'0,'.repeat(index + 1)}]`
        // console.log(lock)
        await pool.query('insert into userview set ? on duplicate key update ?', [{ index, id, uid, uid_id }, { index, id, uid, uid_id }])
    }
    res.send('ok')

    const json = (await pool.query('select * from vapp_prereview_getprereviewresource where ?', { id }))[0]
    const count = Number(_.get(json, '0.count'))
    if (index >= count) {
        let { ycompnum, compnum, precomplete, complete, yxresetflg, fxresetflg } = (await pool.query('SELECT * FROM compass_kids.userlesson where lessonid=?;', req.query.lessonid))[0][0]
        if (req.query.type == 1) {
            if (!yxresetflg) {
                ycompnum = ycompnum ? ycompnum + 1 : 1
                precomplete = 1
                yxresetflg = 1
                await pool.query('update userlesson set ? where lessonid=?', [{ ycompnum, precomplete, yxresetflg }, req.query.lessonid])
            }
        }
        else if (req.query.type == 2) {
            if (!fxresetflg) {
                compnum = compnum ? compnum + 1 : 1
                complete = 1
                fxresetflg = 1
                await pool.query('update userlesson set ? where lessonid=?', [{ compnum, complete, fxresetflg }, req.query.lessonid])
            }
        }
    }
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

app.get('/setTime', async (req, res) => {
    const { name, old_time, delta_time } = req.query
    let id = req.auth.id

    if (name && Number(delta_time + id + old_time)) {
        const { admin } = (await pool.query('SELECT * FROM compass_kids.users where ?', { id }))[0][0]
        if (admin) {
            const user = (await pool.query('SELECT * FROM compass_kids.users where ?', { name }))[0]
            id = _.get(user, '0.id')
            if (!id) {
                res.statusCode = 404
                res.send('没有课程计划！')
                return
            }
            else {
                const connection = await pool.getConnection()
                await connection.query('set sql_safe_updates=0;')
                await connection.query('update userlesson set starttime=starttime+? where ? and starttime>=?;', [delta_time, { id }, old_time])
                connection.release()
                res.send('')
                return
            }
        }
    }
})

app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send('请先登录')
    }
})

const port = Number(process.env.PORT || 80)
const host = process.env.HOST || '0.0.0.0'
app.listen(port, host)
