const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const testDbName = `batloung_test_${process.pid}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
process.env.DB_NAME = testDbName;

const { pool } = require('../config/db');

let admin;

const stripDatabaseStatements = (sql) => sql
  .replace(/^\uFEFF/, '')
  .replace(/CREATE DATABASE[^;]+;\s*/im, '')
  .replace(/USE[^;]+;\s*/im, '');

const setup = async () => {
  admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });

  await admin.query(`CREATE DATABASE \`${testDbName}\``);
  await admin.query(`USE \`${testDbName}\``);

  const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), 'utf8');
  await admin.query(stripDatabaseStatements(schema));
  await admin.query(stripDatabaseStatements(seed));
};

const teardown = async () => {
  await pool.end();
  if (!admin) return;
  await admin.query('USE mysql');
  await admin.query(`DROP DATABASE IF EXISTS \`${testDbName}\``);
  await admin.end();
};

module.exports = { setup, teardown, pool, testDbName };
