const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  connectionString: process.env.DB_CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false
  },
  family: 4 
};

const pool = new Pool(config);


pool.query('SELECT NOW()')
  .then(res => console.log('🎉 Connected to Supabase at:', res.rows[0].now))
  .catch(err => console.error('❌ Connection failed:', err.message));

module.exports = pool;
