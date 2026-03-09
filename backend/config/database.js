const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Enable SSL only for PlanetScale or when explicitly set
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: true
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
