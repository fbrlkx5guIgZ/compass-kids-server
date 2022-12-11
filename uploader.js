import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import path from 'path'
import COS from 'cos-nodejs-sdk-v5'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const cos = new COS({
    SecretId: 'REDACTED_TENCENT_SECRET_ID',
    SecretKey: 'REDACTED_TENCENT_SECRET_KEY'
});

const list_file = fs.createWriteStream(path.resolve('static', 'videos.txt'))
await new Promise((resolve, reject) => {
    list_file.on('ready', resolve)
})

const ls = fs.readdirSync(path.resolve('static'))
const json = (await db.query('SELECT * FROM compass_kids.vapp_prereview_getprereviewresource;'))[0]

for (const item of json) {
    const part_list = JSON.parse(item.partList)
    const id = item.id
    for (let index = 0; index < part_list.length; index++) {
        const part = part_list[index]
        if (part.url) {
            const file = decodeURI(part.url.match(/[^/]+$/)[0])
            // if (part.title.match(/拓展视频|动漫歌曲|动漫故事|故事预热/)) {
            if (ls.includes(file)) {
                const data = await cos.putObject({
                    Bucket: 'lqxeln8v8bow-1314265802', /* 填入您自己的存储桶，必须字段 */
                    Region: 'ap-nanjing',  /* 存储桶所在地域，例如ap-beijing，必须字段 */
                    Key: file,  /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
                    StorageClass: 'STANDARD',
                    /* 当Body为stream类型时，ContentLength必传，否则onProgress不能返回正确的进度信息 */
                    Body: fs.createReadStream(path.resolve('static', file)), // 上传文件对象
                    ContentLength: fs.statSync(path.resolve('static', file)).size,
                    onProgress: function (progressData) {
                        console.log(JSON.stringify(progressData));
                    }
                }).catch()
            }
        }
    }
}
db.end()