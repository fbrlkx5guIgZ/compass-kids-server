import fs from 'fs'
import process from 'process'
import path from 'path'
import { spawn } from 'child_process'

const convert_log = fs.createWriteStream(path.resolve('concert_log.log'))
const dir = path.resolve(process.argv[2])
const ls = fs.readdirSync(dir || process.cwd()).filter(file => file.match(/\.mov$/))
for (const file of ls) {
    const new_file = file.replace(/^(.+?)[ .].+$/, '$1.mp4')
    const child = spawn('ffmpeg', ['-i', path.resolve(dir, file), path.resolve(process.cwd(), 'static', new_file)])
    child.stderr.on('data', chunk => {
        const output = String(chunk)
        if (output.match(/Overwrite\?/)) {
            console.log(new_file + ' has done')
            child.stdin.write('n\n')
        }
        else if (output.match(/^frame=/)) {
            process.stdout.write(new_file + ' ' + output)
        }
        else {
            convert_log.write(output)
        }
    })

    await new Promise((resolve, reject) => {
        child.stdout.on('end', resolve)
    })
    child.kill()
}