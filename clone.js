import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import fetch from 'node-fetch'
import https from 'https'
import console from 'console'
import COS from 'cos-nodejs-sdk-v5'

https.globalAgent = new https.Agent({
    timeout: 60 * 1000,
    maxTotalSockets: 10
})

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

// SECRETID 和 SECRETKEY请登录 https://console.cloud.tencent.com/cam/capi 进行查看和管理
var cos = new COS({
    SecretId: 'REDACTED_TENCENT_SECRET_ID',
    SecretKey: 'REDACTED_TENCENT_SECRET_KEY'
});

const base = 'https://www.ebanxue.com/'
const source_base = 'https://qiniu.nicekid.com/'
const cloud_base = 'https://cloud.nicekid.com/'

const StartLessonList = 'Vapp/Lesson/getStartLessonList'
const EndLessonList = 'Vapp/Lesson/getEndLessonList'
const EndLessonCmpflg = 'Vapp/Lesson/getEndLessonCmpflg'
const PrereviewResource = 'Vapp/Prereview/getPrereviewResource'
const EndLesson = 'Vapp/Lesson/getEndLesson'
const ExamPart = 'Vapp/Challenge/getExamPart'
const LessonBook = 'Vapp/Lesson/getLessonBook'
const BookSource = 'Vapp/Book/getBookSource'

const sessionid = 75399
const user_list = [56150, 23305, 55311, 29329]
// const user_list = [56150]

const url_encode = args => Object.keys(args).length ? Object.keys(args).map(value => `${value}=${args[value]}`).join('&') : ''
const to_url = (url, base) => {
    try {
        return new URL(url)
    }
    catch (error) {
        return new URL(url, base)
    }
}

const save_static = async (source, base) => {
    const url = to_url(source, base)
    let errno, resp
    try {
        resp = await fetch(url)
    } catch (error) {
        await save_static(source, base)
        return
    }
    if (resp && resp.status == 200) {
        const data = await resp.arrayBuffer().catch((err) => {
            errno = err.errno
        })
        // console.log(`write source ${url}`)
        pre_mkdir(path.join('_static', decodeURI(url.pathname)))
        fs.writeFile(path.join('_static', decodeURI(url.pathname)), Buffer.from(data || errno), (err) => {
            if (err) {
                console.log(err)
            }
            else {
                console.log(`source ${url} written`)
            }
        })
    }
    else {
        console.log(`source ${url} failed with status ${resp ? resp.status : errno}`)
    }
}

const pre_mkdir = (pth) => {
    const dirname = path.dirname(pth)
    if (!fs.existsSync(dirname)) {
        pre_mkdir(dirname)
        fs.mkdirSync(dirname)
    }
}

const pre_fetch = async (url, args) => {
    const para = url_encode(args)
    const full_url = to_url(url + '?' + para, base)
    const resp = await fetch(full_url)
    const json = await resp.json()
    if (json.intenum) {
        return json.intenum
    }
}

const pre_resource = async (json) => {
    if (!json.partList) {
        return []
    }
    for (const part of json.partList) {
        if (part.url) {
            await save_static(part.url)
            part.url = part.url.replace(/^https?:\/\/[^/]+?\//, 'https://static.compass-kids.com/')
        }
    }
    return Object.assign({}, json.partList)
}

const fetch_datalist = async (url, args) => {
    const userid = args.userid

    // const table = url.split('/').join('_')
    const table = url.split('/').join('_').replace('StartLessonList', 'EndLessonList')

    try {
        await db.query('SELECT * FROM ' + table + ' limit 0')
    } catch (error) {
        await db.query('create table ' + table + ' (lessonid int primary key)')
    }

    const para = url_encode(args)
    const full_url = to_url(url + '?' + para, base)
    const resp = await fetch(full_url)
    const json = await resp.json()

    try {
        json.datalist = Array.isArray(json.datalist) ? json.datalist : Object.values(json.datalist)
        for (const data of json.datalist) {
            try {
                for (const key of Object.keys(data)) {
                    if (typeof data[key] == 'object' && json[key] != null) {
                        data[key] = JSON.stringify(data[key])
                    }
                }
                await db.query('insert into ' + table + ' set ?', data)
            } catch (error) {
                if (error.sqlMessage && error.sqlMessage.match(/Duplicate/)) {
                    console.log(`${data.lessonid} done`)
                    continue
                }
                for (const key of Object.keys(data)) {
                    try {
                        if (typeof data[key] == 'boolean') {
                            await db.query(`alter table ${table} add \`${key}\` boolean`)
                        }
                        else if (typeof data[key] == 'number' || typeof data[key] == 'string' && data[key] && Number(data[key]) + 1) {
                            await db.query(`alter table ${table} add \`${key}\` int`)
                        }
                        else if (typeof data[key] == 'string' && data[key].length <= 255) {
                            await db.query(`alter table ${table} add \`${key}\` varchar(255)`)
                        }
                        else {
                            await db.query(`alter table ${table} add \`${key}\` text`)
                        }
                    } catch (error) {
                        // console.log(1, error.sqlMessage)
                    }
                }
                await db.query('insert into ' + table + ' set ?', data).catch((error) => {
                    console.log(2, error.sqlMessage)
                })
            }

            // await fetch_resource(EndLesson, { lessonid: data.lessonid, userid }, data.lessonid)
            for (let lessontype = 1; lessontype <= 2; lessontype++) {
                const args = { classtype: data.classtype, classlevel: data.classlevel, lessontype, lessonno: data.lessonno, starttime: data.starttime, classid: data.classid, lessonid: data.lessonid, userid }
                let partList = await fetch_resource(PrereviewResource, args, `${data.lessonid}${lessontype}`, 'POST', 'data', pre_resource)
                partList = Array.isArray(partList) ? partList : Object.values(partList)
                console.log(data.lessonid)

                for (const part of partList) {
                    if (part.partid) {
                        await fetch_resource(ExamPart, { part_id: part.partid }, part.partid, 'POST', 'data')
                    }
                    if (part.bookid) {
                        await fetch_resource(BookSource, { bookid: part.bookid }, part.bookid, 'POST', 'data')
                    }
                }
            }
        }
        return json.datalist
    } catch (error) {
        console.log(error)
        return []
    }
}

const fetch_resource = async (url, args, id, method = 'GET', path = '', pre_func) => {
    const table = url.split('/').join('_')

    try {
        await db.query('SELECT * FROM ' + table + ' limit 0')
    } catch (error) {
        await db.query('create table ' + table + ' (id int primary key)')
    }

    const para = url_encode(args)
    let resp
    if (method == 'POST') {
        const headers = {
            Accept: "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            Xweb_xhr: "1"
        }
        const full_url = to_url(url, base)
        resp = await fetch(full_url, { method, body: para, headers })
    }
    else if (method == 'GET') {
        const full_url = to_url(url + '?' + para, base)
        resp = await fetch(full_url)
    }
    else {
        return
    }

    const json = path ? _.get(await resp.json(), path) : await resp.json()
    let raw_json = json
    if (pre_func) {
        raw_json = await pre_func(json)
    }
    json.id = id

    try {
        for (const key of Object.keys(json)) {
            if (typeof json[key] == 'object' && json[key] != null) {
                json[key] = JSON.stringify(json[key])
            }
        }
        await db.query('insert into ' + table + ' set ?', json)
    } catch (error) {
        if (error.sqlMessage.match(/Duplicate/)) {
            return []
        }
        for (const key of Object.keys(json)) {
            try {
                if (typeof json[key] == 'boolean') {
                    await db.query(`alter table ${table} add \`${key}\` boolean`)
                }
                else if (typeof json[key] == 'number' || typeof json[key] == 'string' && json[key] && Number(json[key]) + 1) {
                    await db.query(`alter table ${table} add \`${key}\` int`)
                }
                else if (typeof json[key] == 'string' && json[key].length <= 255) {
                    await db.query(`alter table ${table} add \`${key}\` varchar(255)`)
                }
                else {
                    await db.query(`alter table ${table} add \`${key}\` text`)
                }
            } catch (error) {
                // console.log(3, error.sqlMessage)
            }
        }
        await db.query('insert into ' + table + ' set ?', json).catch((error) => {
            console.log(JSON.stringify(json), error.sqlMessage)
        })
    }

    return raw_json
}

for (const userid of user_list) {
    await fetch_datalist(StartLessonList, { sessionid, userid })
    await fetch_datalist(EndLessonList, { sessionid, userid })
}
console.log('finished!')
db.end()