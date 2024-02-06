const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const axios = require('axios');
const https = require('https');
const console = require('console');
const COS = require('cos-nodejs-sdk-v5');


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

const resolveUrl = (url, base) => {
    try {
        return new URL(url)
    }
    catch (error) {
        return new URL(url, base)
    }
}

async function downloadResource(source, base, maxRetries = 3) {
    const absoluteURL = resolveUrl(source, base)

    let retries = 0;
    let success = false;

    while (retries < maxRetries && !success) {
        try {
            const response = await axios.get(absoluteURL, { responseType: 'arraybuffer' });
            const relativePath = absoluteURL.pathname
            const outputPath = path.resolve(relativePath);

            // Ensure the directory exists
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });

            // Save the binary data to the local file system
            fs.writeFileSync(outputPath, Buffer.from(response.data));

            console.log(`Downloaded and saved ${source} to ${outputPath}`);
            success = true;
        } catch (error) {
            console.error(`Error downloading ${absoluteURL}: ${error.message}`);
            retries++;
            if (retries < maxRetries) {
                console.log(`Retrying (${retries}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            } else {
                console.error(`Max retries reached. Unable to download ${absoluteURL}`);
            }
        }
    }
}

async function fetchData(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw new Error(`Error fetching data from ${url}: ${error.message}`);
    }
}

async function createTableIfNotExists(connection, tableName, fields) {
    const [rows] = await connection.execute('SHOW TABLES LIKE ?', [tableName]);
    if (rows.length === 0) {
        // Table does not exist, create it
        const createTableQuery = `CREATE TABLE ${tableName} (${fields.map(field => `${field.name} ${field.type}`).join(', ')})`;
        await connection.execute(createTableQuery);
        console.log(`Table '${tableName}' created.`);
    }
}


async function addFieldIfNotExists(connection, tableName, fieldName, fieldType) {
    const [columns] = await connection.execute(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [fieldName]);
    if (columns.length === 0) {
        // Field does not exist, add it
        const addFieldQuery = `ALTER TABLE ${tableName} ADD COLUMN ${fieldName} ${fieldType}`;
        await connection.execute(addFieldQuery);
        console.log(`Field '${fieldName}' added to '${tableName}'.`);
    }
}

async function insertDataIntoTable(connection, tableName, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = Array(values.length).fill('?').join(', ');

    const insertQuery = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

    await connection.execute(insertQuery, values);
    console.log(`Data inserted into '${tableName}'.`);
}

async function processData(url, tableName, connection) {
    const jsonData = await fetchData(url);

    if (typeof jsonData !== 'object') {
        throw new Error('Invalid JSON format.');
    }

    await createTableIfNotExists(connection, tableName, Object.entries(jsonData).map(([key, value]) => ({ name: key, type: typeof value })));

    for (const [key, value] of Object.entries(jsonData)) {
        await addFieldIfNotExists(connection, tableName, key, typeof value);
    }

    await insertDataIntoTable(connection, tableName, jsonData);
}

const pre_resource = async (json) => { //保存静态资源 不包含 insert
    if (!json.partList) {
        return []
    }
    for (const part of json.partList) {
        if (part.url) {
            await downloadResource(part.url)
            part.url = part.url.replace(/^https?:\/\/[^/]+?\//, 'https://static.compass-kids.com/')
            if (!part.url.match(/\.[^/]+$/)) {
                part.url = part.url + '.mp4'
            }
        }
    }
    return Object.assign({}, json.partList)
}

const fetch_datalist = async (url, args) => { //包含 insert 以及 BookSource 和 ExamPart
    const userid = args.userid

    // const table = url.split('/').join('_')
    const table = url.split('/').join('_').replace('StartLessonList', 'EndLessonList')

    try {
        await db.query('SELECT * FROM ' + table + ' limit 0')
    } catch (error) {
        await db.query('create table ' + table + ' (lessonid int primary key)')
    }

    const para = new URLSearchParams(args).toString()
    const full_url = resolveUrl(url + '?' + para, base)
    const resp = await fetch(full_url)
    const json = await resp.json()

    try {
        json.datalist = Array.isArray(json.datalist) ? json.datalist : Object.values(json.datalist)
        for (const data of json.datalist) {
            try {
                if (data.lock) {
                    console.log(`${data.lessonid} locked`)
                    continue
                }
                for (const key of Object.keys(data)) {
                    if (typeof data[key] == 'object' && json[key] != null) {
                        data[key] = JSON.stringify(data[key])
                    }
                }
                await db.query('insert into ' + table + ' set ?', data)
            } catch (error) {
                if (error.sqlMessage && error.sqlMessage.match(/Duplicate/)) {
                    console.log(`${data.lessonid} done`) //重复不会拉资源
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

const fetch_resource = async (url, args, id, method = 'GET', path = '', pre_func) => { //提取数据 包含 insert
    const table = url.split('/').join('_')

    try {
        await db.query('SELECT * FROM ' + table + ' limit 0')
    } catch (error) {
        await db.query('create table ' + table + ' (id int primary key)')
    }

    const para = new URLSearchParams(args).toString()
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
        const full_url = resolveUrl(url, base)
        resp = await fetch(full_url, { method, body: para, headers })
    }
    else if (method == 'GET') {
        const full_url = resolveUrl(url + '?' + para, base)
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

const main = async () => {
    for (const userid of user_list) {
        await fetch_datalist(StartLessonList, { sessionid, userid })
        await fetch_datalist(EndLessonList, { sessionid, userid })
    }
}

main().then(() => {
    console.log('finished!')
    db.end()
})
