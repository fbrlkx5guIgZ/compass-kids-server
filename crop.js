import fs from 'fs'
import process from 'process'
import path from 'path'
import { spawn } from 'child_process'

const raw_path = 'C:\\Users\\DuHeng\\Videos'
const dist_path = 'C:\\Users\\DuHeng\\Desktop\\static\\k'

const convert_log = fs.createWriteStream(path.resolve('concert_log.log'))
const ls = fs.readdirSync(path.resolve(raw_path)).filter(file => file.match(/\.mp4$/))
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
    const child = spawn('ffmpeg', ['-i', path.resolve(raw_path, file), '-vf', `crop=${width}:${height}`, path.resolve(dist_path, file), '-n'])
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
}