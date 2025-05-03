// db.js
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

// Test the connection
async function testConnection() {
  try {
    await pool.query('SELECT NOW()')
    console.log('✅ Connected to DB')
  } catch (err) {
    console.error('❌ Connection to DB failed:', err.message)
  }
}

testConnection()

export default pool
