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

// const videoFolder = './sideload/__files';
const videoFolder = './static/';

// 获取视频的长和宽
function getVideoSize(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const { width, height } = metadata.streams[0].coded_width ? metadata.streams[0] : metadata.streams[1];
        resolve({ width, height });
      }
    });
  });
}

// 裁剪视频
function cropVideo(inputFile, outputFile, width, height) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setStartTime('00:00:04.5')
      .videoFilter(`crop=iw:ih-(${height}*.05)*2,scale=${width}:-1`)
      .on('progress', (progress) => {
        console.log(`Processing: ${Math.round(progress.percent)}%`);
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .save(outputFile);
  });
}

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
  const { width, height } = await getVideoSize(filePath);

  if (width > height) {
    console.log(`Uploading '${fileName}' directly to the storage bucket.`);
    await uploadToCOS(fileName, filePath);
  } else {
    console.log(`Processing and uploading '${fileName}'.`);
    const tempFilePath = filePath + '.temp.mp4';
    await cropVideo(filePath, tempFilePath, width, height);
    await uploadToCOS(fileName, tempFilePath);
    await deleteLocalFile(tempFilePath);
  }

  await deleteLocalFile(filePath);
}

// 主函数
async function processVideos() {
  const videoFiles = fs.readdirSync(videoFolder).filter((file) => {
    const extname = path.extname(file).toLowerCase();
    return extname === '.mp4' || extname === '.mov'; // 根据需要修改支持的视频格式
  });

  for (const fileName of videoFiles) {
    await processVideo(fileName);
  }
}

processVideos()
  .then(() => {
    console.log('All videos processed and uploaded successfully.');
  })
  .catch((err) => {
    console.error('Error processing videos:', err);
  });
