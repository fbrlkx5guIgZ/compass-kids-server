import fs from 'fs'
import process from 'process'
import path from 'path'
import { spawn } from 'child_process'

const convert_log = fs.createWriteStream(path.resolve('concert_log.log'))
const dir = path.resolve(process.argv[2])
const once = async () => {
    const ls = fs.readdirSync(dir || process.cwd()).filter(file => file.match(/\.mov$/))
    for (const file of ls) {
        const new_file = file.replace(/^(.+?)[ .].+$/, '$1.mp4')
        const child = spawn('ffmpeg', ['-i', path.resolve(dir, file), path.resolve(process.cwd(), 'static', new_file)])
        console.log(new_file)
        child.stderr.on('data', chunk => {
            const output = String(chunk)
            if (output.match(/Overwrite\?/)) {
                console.log('has done')
                child.stdin.write('n\n')
            }
            else if (output.match(/^frame=.+?\r$/)) {
                process.stdout.write(output)
            }
            else {
                convert_log.write(output)
            }
        })

        await new Promise((resolve, reject) => {
            child.stdout.on('end', resolve)
        })
        fs.rm(path.resolve(dir, file), (err) => { 
            if (err) {
                console.log(err) 
            }
            else{
                console.log('delete raw!')
            }
        })
        child.kill()
    }
    console.log('once')
    await new Promise(resolve => {
        setTimeout(resolve, 5 * 1000)
    })
    once()
}

once()