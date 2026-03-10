// Quick test script to verify Supabase connection
require('dotenv').config();
const pool = require('./config/database');

async function testConnection() {
  try {
    console.log('Testing Supabase PostgreSQL connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');
    
    const [result] = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('\n✅ Connection successful!');
    console.log('Server time:', result[0].current_time);
    console.log('PostgreSQL version:', result[0].pg_version.split(',')[0]);
    
    // Check if tables exist
    const [tables] = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    if (tables.length > 0) {
      console.log('\n📋 Existing tables:');
      tables.forEach(t => console.log('  -', t.table_name));
    } else {
      console.log('\n⚠️ No tables found. You need to run the schema.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    if (error.message.includes('password')) {
      console.log('\nHint: Password may have special characters that need URL encoding');
    }
    process.exit(1);
  }
}

testConnection();
