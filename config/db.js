
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({
    path: path.join(__dirname, '..', '.env')
});

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 50,
    connectTimeout: 10000,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Test database connection
async function testConnection() {
    try {
        const connection = await db.getConnection();

        console.log(`MySQL connected to database "${process.env.DB_NAME}".`);

        connection.release();
        return true;

    } catch (error) {
        console.error('MySQL connection failed:', error.message);
        throw error;
    }
}

module.exports = {
    db,
    testConnection
};