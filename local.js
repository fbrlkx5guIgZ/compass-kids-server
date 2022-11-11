import fs from 'fs'
import mysql from 'mysql2/promise'
import _ from 'lodash'

const getendlessonlist = 'vapp_lesson_getendlessonlist'
const getprereviewresource = 'vapp_prereview_getprereviewresource'

const db = mysql.createPool({
    host: 'compass-kids.com',
    user: 'root',
    password: 'REDACTED_DB_PASSWORD',
    database: 'compass_kids'
})

const code = 'admin'
const list_raw = []
const list_new = ["K2A-I like windy weather",
"K2A-The Westher is changing",
"K2A-Families and jobs",
"K2A-Family and clothes",
"K2A-A picnic problems",
"K2A-Do you like chicken pizza?",
"K2A-Too cold for picnic",
"K2A-Pets",
"K2A-Scry safriy",
"K2A-I am counting",
"K2A-Let's a count",
"K2A-Parrten and clothes",
"K2A-Patten and school things",
"K2A-My house",
"K2A-Patten and rooms",
"K2A-In the house-1",
"K2A-In the house-2",
"K2A-The Big Race",
"K2A-Fast and Slow",
"K2A-Go to the Airport-1",
"K2A-Go to the Airport-2",
"K2A-I Can see it with my eyes",
"K2A-Can you hear the music",
"K2A-Five Senses-1",
"K2A-Five Senses-2",
"K2A-What's your job-1",
"K2A-What's your job-2",
"K2A-What do you want to be-1",
"K2A-What do you want to be-2",
"K2A-Seven days in a week-1",
"K2A-Seven days in a week-2",
"K2A-Time to eat-1",
"K2A-Time to eat-2",
"K2A-I've got a headache",
"K2A-I'm feeling ill",
"K2A-See a doctor",
"K2A-Hello,Doctor Bob",
"K2A-Time and dinner",
"K2A-What can I for breakfast",
"K2A-Four season-1",
"K2A-Four season-2"]
const json = (await db.query('SELECT * FROM vapp_prereview_getprereviewresource'))[0]
// const stream = fs.createWriteStream('video_L_series.txt', 'utf-8')
for (const item of json) {
    // stream.write(item.lessonname)
    // const lessonid = json[index].lessonid || 0
    const lessonname = list_new[index]
    const id = item.id || 0
    let partList = JSON.parse(item.partList) || [{}]
    partList[0].url = _.get(partList, '0.url.replace') ? partList[0].url.replace(/https?:\/\/.+?\//, 'https://www.compass-kids.com/') : ''
    partList = JSON.stringify(partList)

    console.log(id)
    // await db.query('update vapp_lesson_getendlessonlist set ? where ?', [{ lessonname }, { lessonid }])
    await db.query('update vapp_prereview_getprereviewresource set ? where ?', [{ partList }, { id }])
    // stream.write(partList.url ? '\r\n' + partList.title + '\n' + partList.url : '')
    // partList = (JSON.parse(part2.partList) || [{ url: undefined }])[0]
    // stream.write(partList.url ? '\r\n' + partList.title + '\n' + partList.url + '\n\n' : '\n\n')
}

db.end()