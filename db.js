const { Pool } = require('pg');
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  connectionString: process.env.DB_CONNECTION_STRING,
  ssl: isProduction ? { rejectUnauthorized: true } : false
  connectionString: process.env.DB_CONNECTION_STRING,
  ssl: isProduction ? { rejectUnauthorized: true } : false
};

const pool = new Pool(config);

// Test connection immediately
pool.query('SELECT NOW()')
  .then(res => console.log('🎉 Connected to Supabase at:', res.rows[0].now))
  .catch(err => console.error('❌ Connection failed:', err.message));
const pool = new Pool(config);

// Test connection immediately
pool.query('SELECT NOW()')
  .then(res => console.log('🎉 Connected to Supabase at:', res.rows[0].now))
  .catch(err => console.error('❌ Connection failed:', err.message));

module.exports = pool;