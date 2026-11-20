const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const readSql = (file) => fs
  .readFileSync(path.join(__dirname, file), 'utf8')
  .replace(/^\uFEFF/, '')
  .replace(/^\s*CREATE\s+DATABASE[^;]+;\s*/im, '')
  .replace(/^\s*USE\s+[^;]+;\s*/im, '');

const main = async () => {
  if (!process.env.DB_NAME) {
    throw new Error('DB_NAME is required');
  }

  const sql = ['schema.sql', 'seed.sql', 'demoData.sql'].map(readSql).join('\n\n');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
    console.log(`Database ${process.env.DB_NAME} initialized.`);
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error(`Database initialization failed: ${error.message}`);
  process.exit(1);
});
