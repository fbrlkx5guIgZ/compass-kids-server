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

const list_new = ["K2B-My new home-1",
"K2B-My new home-2",
"K2B-It's behind the sofa-1",
"K2B-It's behind the sofa-2",
"K2B-Magic shirt",
"K2B-Season and clothes",
"K2B-Let's play-1",
"K2B-Let's play-2",
"K2B-Let's do something-1",
"K2B-Let's do something-2",
"K2B-I Need to grow up now",
"K2B-I do that everyday",
"K2B-How often ",
"K2B-Help at home",
"K2B-Let's make a smoothie-1",
"K2B-Let's make a smoothie-2",
"K2B-How do you eat-1",
"K2B-How do you eat-2",
"K2B-What's the fridge-1",
"K2B-What's the fridge-2",
"K2B-On a farm-1",
"K2B-On a farm-2",
"K2B-At the shopping Center-1",
"K2B-At the shopping Center-2",
"K2B-Let's go shop-1",
"K2B-Let's go shop-2",
"K2B-My brithday party-1",
"K2B-My brithday party-2",
"K2B-Come to my brithday party-1",
"K2B-Come to my brithday party-2",
"K2B-My New School-1",
"K2B-My New School-2",
"K2B-What's behind the door-1",
"K2B-What's behind the door-2",
"K2B-They are using tables-1",
"K2B-They are using tables-2",
"K2B-Let's go out-1",
"K2B-Let's go out-2",
"K2B-Daily's activity",
"K2B-Do you help at home",
"K2B-A space smoothie-1",
"K2B-A space smoothie-2",
"K2B-I am shopping-1",
"K2B-I am shopping-2",
"K2B-Welcome to my school-1",
"K2B-Welcome to my school-2",
"K2B-School day-1",
"K2B-School day-2",
"K2B-My time table-1",
"K2B-My time table-2"]
const list_raw = ["K2B-29-My new home-1",
"K2B-30-My new home-2",
"K2B-7-It's behind the sofa-1",
"K2B-8-It's behind the sofa-2",
"K2B-1-Season and clothes-1",
"K2B-2-Season and clothes-2",
"L3-17-Let's play-1",
"L3-18-Let's play-2",
"L3-19-Let's play-3",
"L3-20-Let's play-4",
"L3-29-I Need to grow up now",
"L3-30-I do that everyday",
"L3-31-How often-1",
"L3-32-How often-2",
"K2B-14-Let's make a smoothie-1",
"K2B-13-Let's make a smoothie-2",
"K2B-14-How do you eat-1",
"K2B-15-How do you eat-2",
"K2B-On a farm-1",
"K2B-On a farm-2",
"K2B-19-On a farm-3",
"K2B-20-On a farm-4",
"K2B-21-At the shopping Center-1",
"K2B-22-At the shopping Center-2",
"K2B-23-At the shopping Center-3",
"K2B-24-At the shopping Center-4",
"K2B-25-My brithday party-1",
"K2B-26-My brithday party-2",
"K2B-27-Come to my brithday party-1",
"K2B-28-Come to my brithday party-2",
"K2B-29-My New School-1",
"K2B-30-My New School-2",
"K2B-31-What's behind the door-1",
"K2B-32-What's behind the door-2",
"K2B-35-My Timetable-3",
"K2B-36-My Timetable-4",
"K2B-45-Let's go out-1",
"K2B-46-Let's go out-2",
"L3-47-Daily's activity-1",
"L3-47-Daily's activity-2",
"K2B-39-A space smoothie-1",
"K2B-40-A space smoothie-2",
"K2B-43-I am shopping-1",
"K2B-44-I am shopping-2",
"K2B-45-Welcome to my school-1",
"K2B-46-Welcome to my school-2",
"K2B-47-School day-1",
"K2B-48-School day-2",
"K2B-33-My time table-1",
"K2B-34-My time table-2"]
// const json = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like "K3%" order by classlevel+0,lessonno+0;'))[0]
for (const index in list_new) {
    let lessonname = list_raw[index].replace(/(^.+?-)(.+?-).+$/, '$1$2%')
    const single_array = (await db.query('SELECT * FROM compass_kids.vapp_lesson_getendlessonlist where lessonname like ?;', lessonname))[0]
    if (single_array.length != 1 || !list_new[index] || !list_raw[index]) {
        // console.log(list_raw[index])
        continue
    }
    console.log(list_raw[index])
    const lessonid = single_array[0].lessonid || 0
    lessonname = list_new[index]
    const lessonno = index + 1
    const classlevel = 4

    console.log(lessonid)
    await db.query('update vapp_lesson_getendlessonlist set ? where ?', [{ lessonname, lessonno, classlevel }, { lessonid }])
}

db.end()