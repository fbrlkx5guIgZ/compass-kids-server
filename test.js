import fs from 'fs'
import process from 'process'
import path from 'path'
import { spawn } from 'child_process'
import COS from 'cos-nodejs-sdk-v5'

const cos = new COS({
    SecretId: 'REDACTED_TENCENT_SECRET_ID',
    SecretKey: 'REDACTED_TENCENT_SECRET_KEY'
});

// const raw_path = 'C:\\Users\\DuHeng\\Videos'
// const dist_path = 'C:\\Users\\DuHeng\\Desktop\\static\\k'

const raw_path = '_static'
const dist_path = 'crop'

const convert_log = fs.createWriteStream(path.resolve('concert_log.log'))
const ls = fs.readdirSync(path.resolve(dist_path)).filter(file => file.match(/\.mp4$/) || !file.includes('.'))

for (const dist_file of ls) {
    let exists
    await new Promise((resolve, reject) => {
        cos.headObject({
            Bucket: 'lqxeln8v8bow-1314265802', /* 填入您自己的存储桶，必须字段 */
            Region: 'ap-nanjing',  /* 存储桶所在地域，例如ap-beijing，必须字段 */
            Key: dist_file,  /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
        }, function (err, data) {
            if (data) {
                console.log('对象存在');
                exists = true
                resolve()
            }
            else if (err) {
                console.log('对象不存在');
                resolve()
            }
        });
    })
    if (!exists) {
        const data = await cos.putObject({
            Bucket: 'lqxeln8v8bow-1314265802', /* 填入您自己的存储桶，必须字段 */
            Region: 'ap-nanjing',  /* 存储桶所在地域，例如ap-beijing，必须字段 */
            Key: dist_file,  /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
            StorageClass: 'STANDARD',
            /* 当Body为stream类型时，ContentLength必传，否则onProgress不能返回正确的进度信息 */
            Body: fs.createReadStream(path.resolve(dist_path, dist_file)), // 上传文件对象
            ContentLength: fs.statSync(path.resolve(dist_path, dist_file)).size,
            onProgress: function (progressData) {
                // console.log(JSON.stringify(progressData));
                process.stdout.write(JSON.stringify(progressData) + '\r')
            }
        }).catch()
    }
    else {
        fs.rm(path.resolve(dist_path, dist_file), (err) => {
            if (err) {
                console.log(err)
            }
            else {
                console.log('delete raw: ', dist_file)
            }
        })
    }
}
