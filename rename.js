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

const list_new = ["K1B-I can Jump",
    "K1B-He is clapping",
    "K1B-He can play the Piano",
    "K1B-I can dance",
    "K1B-It's Yogurt",
    "K1B-I like Pizza",
    "K1B-Have a Picnic-1",
    "K1B-Have a Picnic-2",
    "K1B-The snowan is wearing a hat",
    "K1B-They are green shorts",
    "K1B-Put on your T-shirts please",
    "K1B-Where is my other sock?",
    "K1B-AT Zoo-1",
    "K1B-Hello,Mrs.Monkey",
    "K1B-A the zoo-2",
    "K1B-Hello,Mr.Lion",
    "K1B-In the park",
    "K1B-Under the slide",
    "K1B-In the tunnel",
    "K1B-Where is the ball",
    "K1B-Can you see sofa?",
    "K1B-In my House",
    "K1B-Move house",
    "K1B-I need warm woollysocks",
    "K1B-It's a fashion show",
    "K1B-These are bears",
    "K1B-Those are owls(c)",
    "K1B-A Fox in my Kitchen",
    "K1B-These are forest animals",
    "K1B-What a big rubber",
    "K1B-What's in yourschoolbag?",
    "K1B-There is a boat",
    "K1B-There aren't planes"]
const list_raw = ["L2-29-Jump!jump!-1",
    "L2-30-Jump!jump!-2",
    "L2-31-It's a piano",
    "L2-32-I can dance",
    "L2-21-It's Yogurt",
    "L2-22-I like Pizza",
    "L2-23-Have a Picnic-1",
    "L2-24-Have a Picnic-2",
    "L2-25-My Clothees-1",
    "L2-26-My CLothees-2",
    "L2-27-MY Clothes-3",
    "L2-28-My Clothes-4",
    "L2-Wild Animals-1",
    "L2-Wild Animals-2",
    "L2-At the zoo-1",
    "L2-At the zoo-2",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "L2-39-What are you wearing-1",
    "L2-40-What are you wearing-2",
    "L2-41-Forest animals-1",
    "L2-42-Forest animals-2",
    "L2-43-About animals-1",
    "L2-44-About animals-2",
    "L2-45-School Things-1",
    "L2-46-School Things-2",
    "L2-47-There is a boat",
    "L2-48-There aren't planes"]
// const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like "K3%" order by classlevel+0,lessonno+0;'))[0]
for (const index in list_new) {
    let lessonname = list_raw[index].replace(/(^.+?-)(.+?-).+$/, '$1$2%')
    let _lessonname = list_new[index].replace(/(^.+?-)(.+?-).+$/, '$1$2%')
    const single_array = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like ? or lessonname like ?;', [lessonname, _lessonname]))[0]
    if (single_array.length != 1 || !list_new[index] || !list_raw[index]) {
        // console.log(list_raw[index])
        continue
    }
    console.log(list_raw[index])
    const lessonid = single_array[0].lessonid || 0
    lessonname = list_new[index]
    const lessonno = index + 1
    const classlevel = 2

    console.log(lessonid)
    await db.query('update vapp_lesson_getendlessonlist set ? where ?', [{ lessonname, lessonno, classlevel }, { lessonid }])
}

db.end()