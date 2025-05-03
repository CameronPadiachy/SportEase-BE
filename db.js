const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  family: 4 // 👈 Force IPv4
};

const pool = new Pool(config);

pool.query('SELECT NOW()')
  .then(res => console.log('🎉 Connected to Supabase at:', res.rows[0].now))
  .catch(err => console.error('❌ Connection failed:', err.message));

module.exports = pool;
