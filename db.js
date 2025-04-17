const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: "devdaddies.database.windows.net",
    database: process.env.DB_DATABASE,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: false
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool =>{
        console.log('Connected to Azure Sql DB');
        return pool;
    })
    .catch(err => console.error('Database connection failed:', err));

module.exports = {sql, poolPromise };

