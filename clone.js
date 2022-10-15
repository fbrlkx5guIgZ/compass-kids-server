import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'

const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

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

const url_encode = args => Object.keys(args).length ? Object.keys(args).map(value => `${value}=${args[value]}`).join('&') : ''
const pre_mkdir = (pth) => {
    const dirname = path.dirname(pth)
    if (!fs.existsSync(dirname)) {
        pre_mkdir(dirname)
        fs.mkdirSync(dirname)
    }
}

const pre_fetch = async (url, args) => {
    const para = url_encode(args)
    const full_url = new URL(url + '?' + para, base)
    const resp = await fetch(full_url)
    const json = await resp.json()
    if (json.intenum) {
        return json.intenum
    }
}

const fetch_datalist = async (url, args) => {
    const userid = args.userid

    const table = url.split('/').join('_')

    const exists = await db.query(`SELECT * FROM information_schema.tables where table_name='${table}'`)
    if (!exists[0].length) {
        await db.query(`create table ${table} (lessonid int, primary key (lessonid))`)
    }


    const para = url_encode(args)
    const full_url = new URL(url + '?' + para, base)
    const resp = await fetch(full_url)
    const json = await resp.json()
    if (json.datalist) {
        json.datalist = Array.prototype.slice.call(json.datalist)
        for (const data of json.datalist) {
            for (const key of Object.keys(data)) {
                const exists = await db.query(`SELECT * FROM information_schema.columns where table_name='${table}' and column_name='${key}'`)
                if (!exists[0].length) {
                    if (typeof data[key] == 'number') {
                        await db.query(`alter table ${table} add \`${key}\` int`)
                    }
                    else if (typeof data[key] == 'string') {
                        await db.query(`alter table ${table} add \`${key}\` text`)
                    }
                    else {
                        await db.query(`alter table ${table} add \`${key}\` text`)
                    }
                }

                if (typeof data[key] != 'number' && typeof data[key] != 'string' && data[key] != null) {
                    data[key] = JSON.stringify(data[key]).replace(/https?:\/\/.+?\//g, '')
                }
                else if (typeof data[key] == 'string') {
                    data[key] = data[key].replace(/https?:\/\/.+?\//g, 'http:\/\/www.compass-kids.com/')
                }
            }

            const done = await db.query(`select * from ${table} where lessonid='${data.lessonid}'`)
            if (done[0].length) {
                console.log(`lessonid ${data.lessonid} done`)
                continue
            }

            const book_args = { classtype: data.classtype, classlevel: data.classlevel, lessonno: data.lessonno, starttime: data.starttime, classid: data.classid, version: data.version }
            await fetch_resource(LessonBook, book_args, `${data.classid}${data.lessonno}`, 'POST')

            await db.query(`insert into ${table} set ?`, data).catch((err) => {
                console.log(err.sqlMessage)
                // console.log(err)
                // throw err
            })

            await fetch_resource(EndLesson, { lessonid: data.lessonid, userid }, data.lessonid)
            for (let lessontype = 1; lessontype <= 2; lessontype++) {
                const args = { classtype: data.classtype, classlevel: data.classlevel, lessontype, lessonno: data.lessonno, starttime: data.starttime, classid: data.classid, lessonid: data.lessonid, userid }
                const json = await fetch_resource(PrereviewResource, args, `${data.lessonid}${lessontype}`, 'POST')
                console.log(data.lessonid)

                for (const part of json.data.partList) {
                    if (part.partid) {
                        const exam_part_json = await fetch_resource(ExamPart, { part_id: part.partid }, part.partid, 'POST')
                        for (const question of exam_part_json.data.questions) {
                            const fetch_list = [question.audio, _.get(question, 'pic.split') ? question.pic.split(';') : null, question.pic_show].flat().filter(value => value)
                            for (const source of fetch_list) {
                                const url = new URL(source, source_base)
                                const resp = await fetch(url)
                                const data = await resp.arrayBuffer()
                                // console.log(`write source ${source}`)
                                pre_mkdir(path.join('static', decodeURI(url.pathname)))
                                fs.writeFile(path.join('static', decodeURI(url.pathname)), Buffer.from(data), (err) => {
                                    if (err) {
                                        console.log(err)
                                    }
                                    else {
                                        // console.log(`source ${source} written`)
                                    }
                                })
                            }
                        }
                    }
                    if (part.bookid) {
                        const book_source_json = await fetch_resource(BookSource, { bookid: part.bookid }, part.bookid, 'POST')
                        const book_source_list = [_.get(book_source_json, 'data.user_img'), _.get(book_source_json, 'data.book_info.rcover'), _.get(book_source_json, 'data.source.map') ? book_source_json.data.source.map(value => [value.pageimg, value.pageaudio]) : null].flat(2).filter(value => value).map(value => decodeURI(value))
                        for (const book_source of book_source_list) {
                            const url = new URL(book_source, cloud_base)
                            const resp = await fetch(url)
                            const data = await resp.arrayBuffer()
                            // console.log(`write cover ${decodeURI(url.pathname)}`)
                            pre_mkdir(path.join('static', decodeURI(url.pathname)))
                            fs.writeFile(path.join('static', decodeURI(url.pathname)), Buffer.from(data), (err) => {
                                if (err) {
                                    console.log(err)
                                }
                                else {
                                    // console.log(`cover ${decodeURI(url.pathname)} written`)
                                }
                            })
                        }
                    }
                }
            }
        }
    }
    return json.datalist ? json.datalist : []
}

const fetch_resource = async (url, args, id, method = 'GET') => {
    const table = url.split('/').join('_')
    const exists = await db.query(`SELECT * FROM information_schema.tables where table_name='${table}'`)
    if (!exists[0].length) {
        await db.query(`create table ${table} (id int, primary key (id))`)
    }

    const para = url_encode(args)
    let full_url, resp
    if (method == 'POST') {
        const headers = {
            Accept: "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            Xweb_xhr: "1"
        }
        full_url = new URL(url, base)
        resp = await fetch(full_url, { method, body: para, headers })
    }
    else {
        full_url = new URL(url + '?' + para, base)
        resp = await fetch(full_url)
    }
    const json = await resp.json()
    const raw_json = Object.assign({}, json)
    for (const key of Object.keys(json)) {
        const exists = await db.query(`SELECT * FROM information_schema.columns where table_name='${table}' and column_name='${key}'`)
        if (!exists[0].length) {
            if (typeof json[key] == 'number') {
                await db.query(`alter table ${table} add \`${key}\` int`)
            }
            else if (typeof json[key] == 'string') {
                await db.query(`alter table ${table} add \`${key}\` text`)
            }
            else {
                await db.query(`alter table ${table} add \`${key}\` text`)
            }
        }

        if (typeof json[key] != 'number' && typeof json[key] != 'string' && json[key] != null) {
            json[key] = JSON.stringify(json[key]).replace(/https?:\/\/.+?\//g, '')
        }
        else if (typeof json[key] == 'string') {
            json[key] = json[key].replace(/https?:\/\/.+?\//g, '')
        }
    }
    json.id = id
    await db.query(`insert into ${table} set ?`, json).catch((err) => {
        console.log(err.sqlMessage)
        // console.log(err)
        // throw err
    })
    return raw_json
}

for (const userid of user_list) {
    const start_list_json = await fetch_datalist(StartLessonList, { sessionid, userid });
    const end_list_json = await fetch_datalist(EndLessonList, { sessionid, userid });
    const cover_list = [].concat(start_list_json, end_list_json).map(value => value.lessoncover).filter(value => value).map(value => decodeURI(value))
    for (const cover of cover_list) {
        const url = new URL(cover, cloud_base)
        const resp = await fetch(url)
        const data = await resp.arrayBuffer()
        // console.log(`write cover ${decodeURI(url.pathname)}`)
        pre_mkdir(path.join('static', decodeURI(url.pathname)))
        fs.writeFile(path.join('static', decodeURI(url.pathname)), Buffer.from(data), (err) => {
            if (err) {
                console.log(err)
            }
            else {
                // console.log(`cover ${decodeURI(url.pathname)} written`)
            }
        })
    }
    const page = await pre_fetch(EndLessonCmpflg, { sessionid, userid });
    await fetch_datalist(EndLessonCmpflg, { sessionid, userid, page });
}