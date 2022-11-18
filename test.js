import fs from 'fs'
import process from 'process'
import path from 'path'
import { spawn } from 'child_process'

const raw_path = 'C:\\Users\\DuHeng\\Videos'

const convert_log = fs.createWriteStream(path.resolve('concert_log.log'))
const ls = fs.readdirSync(path.resolve(raw_path))
try {
    fs.mkdirSync(path.resolve(dist_path))
} catch (error) {

}
for (const file of ls) {
    if (!file.match(/\.mp4/)) {
        fs.renameSync(path.resolve(raw_path, file), `${file}.mp4`)
    }
}