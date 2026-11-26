const mysql = require('mysql2/promise');
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const sample = { "title": "", "url": "", "partid": "0", "type": 1, "isnew": 1, "isfull": 0, "iscanprogress": true, "icon": null }
const drop_lessons = [998938, 998939, 998940, 998941, 1000952, 1000953, 1000954, 1000956, 1000957, 1005250]

const folder = 'C:/Users/compass-kids/Downloads/我的资源'
const site = 'https://static.compass-kids.com/'
const dest = './static/'

const db = mysql.createPool({
	host: process.env.DB_HOST || '127.0.0.1',
	port: Number(process.env.DB_PORT || 3306),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME || 'compass_kids'
})

const add_prereviewresource_video = async (folder, id) => {
	let partList = []
	videoFiles = fs.readdirSync(folder).filter((file) => {
		const extname = path.extname(file).toLowerCase();
		return extname === '.mp4' || extname === '.mov'; // 根据需要修改支持的视频格式
	}).sort((a, b) => {
		Number(a.match(/^\d+/)[0]) - Number(b.match(/^\d+/)[0])
	})
	for (const videoFile of videoFiles) {
		const buffer = fs.readFileSync(path.join(folder, videoFile));
		const hash = crypto.createHash('md5');
		hash.update(buffer, 'utf8');
		const md5 = hash.digest('hex');
		const new_name = videoFile.replace(/^.+\./, `${md5.slice(0, 15)}.`)
		let part = Object.assign({}, sample)
		try {
			part.title = videoFile.match(/(?:\.)(.+?)(?:\.)/)[1]
		} catch (error) {

		}
		part.url = site.concat(new_name)
		partList.push(part)

		fs.copyFileSync(path.join(folder, videoFile), path.resolve(dest, new_name))

	}
	if (partList.length) {
		partList = JSON.stringify(partList)
		await db.query('replace into vapp_prereview_getprereviewresource set ?', { id, partList }).then(() => {
			console.log(id)
		})
	}
}

const add_prereviewresource_videos = async () => {
	for (let index = 0; index < drop_lessons.length; index++) {
		const homework_folder = path.resolve(folder, `homework(${index})`.replace('(0)', ''))
		await add_prereviewresource_video(homework_folder, `${drop_lessons[index]}2`).catch(()=>{})
		fs.rmdir(homework_folder,()=>{console.log((homework_folder))}, { recursive: true, force: true })

		const preview_folder = path.resolve(folder, `预习(${index})`.replace('(0)', ''))
		await add_prereviewresource_video(preview_folder, `${drop_lessons[index]}1`).catch(()=>{})
		fs.rmdir(preview_folder,()=>{console.log(preview_folder)}, { recursive: true, force: true })

	}
}

add_prereviewresource_videos()
