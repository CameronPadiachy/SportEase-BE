const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection
async function testConnection() {
  try {
    await pool.query('SELECT NOW()')
    console.log('✅ Connected to DB')
  } catch (err) {
    console.error('❌ Connection to DB failed:', err.message)
  }
}

testConnection();

module.exports = pool;
