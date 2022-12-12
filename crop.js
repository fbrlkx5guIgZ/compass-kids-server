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
const ls = fs.readdirSync(path.resolve(raw_path)).filter(file => file.match(/\.mp4$/) || !file.includes('.'))
try {
    fs.mkdirSync(path.resolve(dist_path))
} catch (error) {

}
for (const file of ls) {
    const probe_child = spawn('ffprobe', ['-i', path.resolve(raw_path, file), '-v', 'quiet', '-print_format', 'json', '-show_entries', 'stream=width,height'])
    let sum = ''
    probe_child.stdout.on('data', chunk => {
        const output = String(chunk)
        sum = sum.concat(output)
    })
    await new Promise((resolve, reject) => {
        probe_child.stdout.on('end', resolve)
    })
    probe_child.kill()

    const json = JSON.parse(sum)
    const height = json.streams[0].height * (1 - 0.055 * 2)
    const width = json.streams[0].width
    const dist_file = file.replace(/\..+?$/, '.mp4')
    if (height > width) {
        const child = spawn('ffmpeg', ['-i', path.resolve(raw_path, file), '-vf', `crop=${width}:${height}`, path.resolve(dist_path, dist_file), '-n'])
        console.log(file)
        child.stderr.on('data', chunk => {
            const output = String(chunk)
            sum = sum.concat(output)
            if (output.match(/^frame=.+?\r$/)) {
                sum = ''
                process.stdout.write(output)
            }
            else if (output.match(/already exists/)) {
                sum = ''
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
        const data = await cos.putObject({
            Bucket: 'lqxeln8v8bow-1314265802', /* 填入您自己的存储桶，必须字段 */
            Region: 'ap-nanjing',  /* 存储桶所在地域，例如ap-beijing，必须字段 */
            Key: file,  /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
            StorageClass: 'STANDARD',
            /* 当Body为stream类型时，ContentLength必传，否则onProgress不能返回正确的进度信息 */
            Body: fs.createReadStream(path.resolve('crop', dist_file)), // 上传文件对象
            ContentLength: fs.statSync(path.resolve('crop', dist_file)).size,
            onProgress: function (progressData) {
                console.log(JSON.stringify(progressData));
            }
        }).catch()
    }
    else {
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