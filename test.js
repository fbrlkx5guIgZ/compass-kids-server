import fs from 'fs'
import process from 'process'
import path from 'path'
import { spawn } from 'child_process'
import COS from 'cos-nodejs-sdk-v5'
import mysql from 'mysql2/promise'

const cos = new COS({
    SecretId: 'REDACTED_TENCENT_SECRET_ID',
    SecretKey: 'REDACTED_TENCENT_SECRET_KEY'
});

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const raw_path = '_static'
const dist_path = 'crop'

const convert_log = fs.createWriteStream(path.resolve('concert_log.log'))
const ls = fs.readdirSync(path.resolve(dist_path)).filter(file => file.match(/\.mp4$/) || !file.includes('.'))

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
        // pre_mkdir(path.join('_static', decodeURI(url.pathname)))
        fs.writeFile(path.join('_static', decodeURI(url.pathname)), Buffer.from(data || errno), (err) => {
            if (err) {
                console.log(err)
            }
            else {
                console.log(`source ${url} written`)
                cos.putObject({
                    Bucket: 'lqxeln8v8bow-1314265802', /* 填入您自己的存储桶，必须字段 */
                    Region: 'ap-nanjing',  /* 存储桶所在地域，例如ap-beijing，必须字段 */
                    Key: decodeURI(url.pathname),  /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
                    StorageClass: 'STANDARD',
                    /* 当Body为stream类型时，ContentLength必传，否则onProgress不能返回正确的进度信息 */
                    Body: fs.createReadStream(path.join('_static', decodeURI(url.pathname))), // 上传文件对象
                    ContentLength: fs.statSync(path.join('_static', decodeURI(url.pathname))).size,
                    onProgress: function (progressData) {
                        // console.log(JSON.stringify(progressData));
                        process.stdout.write(JSON.stringify(progressData) + '\r')
                    }
                }).catch()
            }
        })
    }
    else {
        console.log(`source ${url} failed with status ${resp ? resp.status : errno}`)
    }
}

const jsons = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource;'))[0]
for (const json of jsons) {
    let { partList } = json
    partList = JSON.parse(partList)
    for (const part of partList) {
        if (part.url) {
            try {
                const json = await fetch(part.url)
                if (json && !json.status.toString().match(/2\d\d/)) {
                    part.url = part.url.replace('static.compass-kids.com', 'cloud.nicekid.com')
                    await save_static(part.url)
                }
            } catch (error) {
                console.log(error)
            }
        }
    }
}