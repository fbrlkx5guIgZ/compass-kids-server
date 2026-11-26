import mysql from 'mysql2/promise';
import COS from 'cos-nodejs-sdk-v5';

// MySQL数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'compass_kids'
};

// 腾讯云对象存储配置
const cosConfig = {
  SecretId: process.env.TENCENT_COS_SECRET_ID,
  SecretKey: process.env.TENCENT_COS_SECRET_KEY,
  Bucket: process.env.TENCENT_COS_BUCKET,
  Region: process.env.TENCENT_COS_REGION
};

// 创建MySQL连接池
const pool = mysql.createPool(dbConfig);

// 创建腾讯云对象存储实例
const cos = new COS(cosConfig);

async function deleteFilesFromBucket(urls) {
  try {
    for (const url of urls) {
      const resourceName = url.substring(url.lastIndexOf('/') + 1);
      await deleteFileFromBucket(resourceName);
    }
    console.log('All files deleted successfully.');
  } catch (err) {
    console.error('Error deleting files:', err);
  }
}

function deleteFileFromBucket(resourceName) {
  return new Promise((resolve, reject) => {
    cos.deleteObject({ Bucket: cosConfig.Bucket, Region: cosConfig.Region, Key: resourceName }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function fetchData() {
  try {
    const connection = await pool.getConnection();

    const query = `
      SELECT *
      FROM vapp_prereview_getprereviewresource AS p
      JOIN vapp_lesson_getendlessonlist AS l ON SUBSTRING(p.id, 1, LENGTH(p.id) - 1) = l.lessonid
      WHERE l.lessonname REGEXP 'G3[A-C]-[0-9]'
      
    `;

    const [rows] = await connection.query(query);
    connection.release();

    const partList = rows.map(row => JSON.parse(row.partList)).flat();
    const urls = partList.filter(item => item.url).map(item => item.url);

    await deleteFilesFromBucket(urls);
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

fetchData();
