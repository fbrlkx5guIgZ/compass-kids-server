import fs from 'fs'
import process, { stdin } from 'process'
import path from 'path'
import { spawn } from 'child_process'

const dir = path.resolve(process.argv[2])
const ls = fs.readdirSync(dir || process.cwd()).filter(file=>file.match(/\.mov$/))
for (const file of ls) {
    const new_file = file.replace(/^(.+?)[ .].+$/, '$1.mp4')
    if (fs.existsSync(path.resolve(dir, new_file))) {
        console.log(new_file + ' done')
        continue
    }
    const read_stream = fs.createReadStream(path.resolve('temp_read.txt'))
    const write_stream = fs.createWriteStream(path.resolve('temp_write.txt'),)
    await Promise.all([
        new Promise((resolve) => {
            read_stream.on('open', resolve)
        }),
        new Promise(resolve => {
            write_stream.on('open', resolve)
        })])
    // spawn('ffmpeg', ['-i', path.resolve(dir, file), path.resolve(dir, new_file)], { stdio: [write_stream, read_stream, read_stream] })
    const child = spawn('ffmpeg', ['-i', path.resolve(dir, file), path.resolve(dir, new_file)], { stdio: [process.stdin, process.stdout, read_stream] })
    console.log(new_file)
    read_stream.on('data', (chunk) => {
        const output = chunk.toString()
        console.log(output)
    })
    // process.stdin.on('data',(chunk)=>{
    //     console.log(chunk)
    // })
    await new Promise((resolve, reject) => {
        process.stdout.on('end', resolve)
    })
    child.kill()
}