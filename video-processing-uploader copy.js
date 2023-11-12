const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  SecretId: 'REDACTED_TENCENT_SECRET_ID',
  SecretKey: 'REDACTED_TENCENT_SECRET_KEY',
});

const bucketName = 'lqxeln8v8bow-1314265802';
const region = 'ap-nanjing';

// const videoFolder = './CompassKidsResourceDownloader/';
const videoFolder = '.'


// 上传文件到COS
function uploadToCOS(fileName, filePath) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucketName,
      Region: region,
      Key: fileName,
      Body: fs.createReadStream(filePath),
    };
    cos.putObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// 删除本地文件
function deleteLocalFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.rm(filePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// 处理单个视频
async function processVideo(fileName) {
  const filePath = path.join(videoFolder, fileName);

  console.log(`Uploading '${fileName}' directly to the storage bucket.`);
  await uploadToCOS(fileName, filePath);
  await deleteLocalFile(filePath);
}

// 主函数
async function processVideos(folder) {
  const videoFiles = fs.readdirSync(folder).filter((file) => {
    const extname = path.extname(file).toLowerCase();
    return extname === '.apk'; // 根据需要修改支持的视频格式
  });

  for (const fileName of videoFiles) {
    await processVideo(fileName);
  }
}

processVideos(videoFolder)