// db.js — shared connection pool singleton
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    max: 50,                        // Increased from 20 for better concurrent load handling
    idleTimeoutMillis: 15000,       // Reduced from 30000 for faster cleanup
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;