import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'
import path from 'path'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

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
            if (!ls.includes(file)) {
                // console.log(part.title, [part.url, file])
                try {
                    const raw_url = JSON.parse((await db.query('SELECT * FROM compass_kids._vapp_prereview_getprereviewresource where ?;', { id }))[0][0].partList)[index].url
                    if (part.url != raw_url) {
                        part.url = raw_url
                        const partList = JSON.stringify(part_list)
                        await db.query('update vapp_prereview_getprereviewresource set ? where ?', [{ partList }, { id }])
                        console.log([item.id, part.title], raw_url)
                        // list_file.write(raw_url + '\n')
                    }
                } catch (error) {
                    console.log('no raw url', file)
                }
            }
            else {
                const local_url = part.url.replace(/https?:\/\/[^/]+?\//, 'https://www.compass-kids.com/')
                if (local_url != part.url) {
                    part.url = local_url
                    const partList = JSON.stringify(part_list)
                    await db.query('update vapp_prereview_getprereviewresource set ? where ?', [{ partList }, { id }])
                    console.log([item.id, part.title], local_url)
                    // list_file.write(local_url + '\n')
                }
            }
        }
    }
}
db.end()