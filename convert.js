import fs from 'fs'
import process from 'process'
import path from 'path'
import { spawn } from 'child_process'

// const fs = require('fs')
// const process = require('process')
// const path = require('path')
// const { spawn } = require('child_process')

const convert_log = fs.createWriteStream(path.resolve('concert_log.log'))
const dir = path.resolve(process.argv[2] || '')
const once = async () => {
    const ls = fs.readdirSync(dir || process.cwd()).filter(file => file.match(/\.mov$/))
    for (const file of ls) {
        const new_file = file.replace(/^(.+?)[ .].+$/, '$1.mp4')
        try {
            fs.mkdirSync(path.resolve(process.cwd(), 'static'))
        } catch (error) {

        }
        const child = spawn('ffmpeg', ['-i', path.resolve(dir, file), path.resolve(process.cwd(), 'static', new_file)])
        console.log(new_file)
        let sum = ''
        child.stderr.on('data', chunk => {
            const output = String(chunk)
            sum = sum.concat(output)
            if (sum.match(/Overwrite\?/)) {
                sum = ''
                console.log('has done')
                child.stdin.write('n\n')
            }
            else if (output.match(/^frame=.+?\r$/)) {
                sum = ''
                process.stdout.write(output)
            }
            else {
                convert_log.write(output + '\n')
                // fs.writeFile(path.resolve('concert_log.log'), sum, () => { })
            }
        })

        await new Promise((resolve, reject) => {
            child.stdout.on('end', resolve)
        })
        fs.rm(path.resolve(dir, file), (err) => {
            if (err) {
                console.log(err)
            }
            else {
                console.log('delete raw: ', file)
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