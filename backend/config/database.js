const { Pool } = require('pg');
require('dotenv').config();

// Support both DATABASE_URL and individual settings
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'pesapilot',
      port: process.env.DB_PORT || 5432,
      ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
    };

const pool = new Pool(connectionConfig);

// Helper function to convert MySQL-style queries to PostgreSQL
// MySQL uses ?, PostgreSQL uses $1, $2, etc.
pool.query = async function(text, params) {
  // Convert ? placeholders to $1, $2, etc.
  let paramIndex = 0;
  const pgText = text.replace(/\?/g, () => `$${++paramIndex}`);
  
  try {
    const result = await Pool.prototype.query.call(this, pgText, params);
    // Return in format compatible with mysql2: [rows, fields]
    return [result.rows, result.fields];
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

module.exports = pool;
