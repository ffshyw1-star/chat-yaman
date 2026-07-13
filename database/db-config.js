const { Pool } = require('pg');
require('dotenv').config();

// إنشاء مجموعة الاتصال بقاعدة البيانات
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chat_yaman',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// معالج الأخطاء
pool.on('error', (err) => {
  console.error('❌ خطأ في مجموعة الاتصال:', err);
});

// اختبار الاتصال
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.stack);
  } else {
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!');
    release();
  }
});

// دالة للبحث
const query = (text, params) => {
  return pool.query(text, params);
};

// دالة للتنفيذ دون إرجاع نتائج
const execute = (text, params) => {
  return pool.query(text, params);
};

module.exports = {
  pool,
  query,
  execute
};