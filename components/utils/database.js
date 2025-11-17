// db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    //ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: true } : false, // Disable SSL for localhost
});

module.exports = pool;