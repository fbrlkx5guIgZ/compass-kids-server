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

const raw_path = 'crop'
const dist_path = 'cut'

const ls = fs.readdirSync(path.resolve('crop'))
const json = (await db.query('SELECT * FROM vapp_prereview_getprereviewresource;'))[0]

for (const item of json) {
    const part_list = JSON.parse(item.partList)
    const id = item.id
    for (let index = 0; index < part_list.length; index++) {
        const part = part_list[index]
        if (part.url) {
            const file = decodeURI(part.url.match(/[^/]+$/)[0])
            if (part.title.includes('知识V课堂')) {
                if (ls.includes(file)) {
                    const child = spawn('ffmpeg', ['-i', path.resolve(raw_path, file), '-ss', '4', '-vcodec', 'copy', '-acodec', 'copy', path.resolve(dist_path, file), '-n'])
                    console.log(file)
                    let exists
                    child.stderr.on('data', chunk => {
                        const output = String(chunk)
                        sum = sum.concat(output)
                        if (output.match(/^frame=.+?\r$/)) {
                            sum = ''
                            process.stdout.write(output)
                        }
                        else if (output.match(/already exists/)) {
                            sum = ''
                            exists = true
                            console.log('has done')
                        }
                        else {
                            convert_log.write(output)
                            // fs.writeFile(path.resolve('concert_log.log'), sum, () => { })
                        }
                    })
                    await new Promise((resolve, reject) => {
                        child.stdout.on('end', resolve)
                    })
                    // fs.rm(path.resolve(dir, file), (err) => {
                    //     if (err) {
                    //         console.log(err)
                    //     }
                    //     else {
                    //         console.log('delete raw: ', file)
                    //     }
                    // })
                    child.kill()
                    if (!exists) {
                        const data = await cos.putObject({
                            Bucket: 'lqxeln8v8bow-1314265802', /* 填入您自己的存储桶，必须字段 */
                            Region: 'ap-nanjing',  /* 存储桶所在地域，例如ap-beijing，必须字段 */
                            Key: file,  /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
                            StorageClass: 'STANDARD',
                            /* 当Body为stream类型时，ContentLength必传，否则onProgress不能返回正确的进度信息 */
                            Body: fs.createReadStream(path.resolve(dist_path, file)), // 上传文件对象
                            ContentLength: fs.statSync(path.resolve(dist_path, file)).size,
                            onProgress: function (progressData) {
                                // console.log(JSON.stringify(progressData));
                            }
                        }).catch()
                    }
                }
            }
        }
    }
}
db.end()