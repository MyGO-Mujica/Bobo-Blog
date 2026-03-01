const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "111111",
  database: process.env.DB_NAME || "my_db_01",
  timezone: "+08:00", // 设置时区为中国标准时间
});

module.exports = db;
