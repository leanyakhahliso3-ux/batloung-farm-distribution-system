const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const main = async () => {
  const sql = ['seed.sql', 'demoData.sql']
    .map((file) => fs.readFileSync(path.join(__dirname, file), 'utf8')
      .replace(/^\uFEFF/, '')
      .replace(/^\s*USE\s+[^;]+;\s*/im, ''))
    .join('\n\n');
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
    const [counts] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM suppliers) AS suppliers,
         (SELECT COUNT(*) FROM fruits) AS fruits,
         (SELECT COUNT(*) FROM stock) AS stock,
         (SELECT COUNT(*) FROM vendors) AS vendors,
          (SELECT COUNT(*) FROM purchases) AS purchases,
          (SELECT COUNT(*) FROM sales) AS sales,
          (SELECT COUNT(*) FROM sale_payment_entries) AS sale_payment_entries,
          (SELECT COUNT(*) FROM purchase_details) AS purchase_details,
          (SELECT COUNT(*) FROM sales_details) AS sales_details`
    );
    console.log(`Seed applied idempotently: ${JSON.stringify(counts[0])}`);
  } finally {
    await connection.end();
  }
};

main().catch((err) => {
  console.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
