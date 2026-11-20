const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = () => ({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });


const main = async () => {
  const pool = mysql.createPool(dbConfig());
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS sale_payment_entries (
        entry_id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        entry_type ENUM('LEGACY', 'PAYMENT', 'ADJUSTMENT') NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_method ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL,
        entry_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_sale_payment_entries_sale_id (sale_id),
        CONSTRAINT chk_sale_payment_entries_amount CHECK (
          (entry_type = 'ADJUSTMENT' AND amount < 0)
          OR (entry_type <> 'ADJUSTMENT' AND amount > 0)
        ),
        CONSTRAINT fk_sale_payment_entries_sale FOREIGN KEY (sale_id)
          REFERENCES sales(sale_id) ON DELETE RESTRICT ON UPDATE CASCADE
      )`
    );

    const [columns] = await pool.query(
      `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fruits' AND COLUMN_NAME = 'status'`
    );
    if (columns.length === 0) {
      throw new Error('fruits.status column was not found');
    }

    const [before] = await pool.query('SELECT COUNT(*) AS total FROM fruits');
    const [salesBefore] = await pool.query('SELECT COUNT(*) AS total FROM sales');
    const [foreignKeysBefore] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
         AND REFERENCED_TABLE_NAME IN ('fruits', 'suppliers', 'vendors', 'purchases', 'sales')`
    );

    const columnType = columns[0].COLUMN_TYPE;
    const alreadyMigrated = columnType.includes("'AVAILABLE'")
      && columnType.includes("'UNAVAILABLE'")
      && !columnType.includes("'ACTIVE'")
      && !columnType.includes("'INACTIVE'");

    if (alreadyMigrated) {
      console.log('Fruit status enum is already AVAILABLE/UNAVAILABLE.');
    } else {
      await pool.query(
        "ALTER TABLE fruits MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'AVAILABLE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE'"
      );

      const [unexpected] = await pool.query(
        "SELECT COUNT(*) AS total FROM fruits WHERE status NOT IN ('ACTIVE', 'INACTIVE', 'AVAILABLE', 'UNAVAILABLE')"
      );
      if (unexpected[0].total > 0) {
        throw new Error('Unexpected fruit status values found; migration aborted before mapping');
      }

      await pool.query("UPDATE fruits SET status = 'AVAILABLE' WHERE status = 'ACTIVE'");
      await pool.query("UPDATE fruits SET status = 'UNAVAILABLE' WHERE status = 'INACTIVE'");
      await pool.query(
        "ALTER TABLE fruits MODIFY COLUMN status ENUM('AVAILABLE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE'"
      );
      console.log('Fruit status enum migrated from ACTIVE/INACTIVE to AVAILABLE/UNAVAILABLE.');
    }

    const [legacyBackfill] = await pool.query(
      `INSERT INTO sale_payment_entries (sale_id, entry_type, amount, payment_method, entry_date)
       SELECT s.sale_id, 'LEGACY', s.amount_paid, s.payment_method, s.sale_date
       FROM sales s
       WHERE s.amount_paid > 0
         AND NOT EXISTS (
           SELECT 1
           FROM sale_payment_entries e
           WHERE e.sale_id = s.sale_id AND e.entry_type = 'LEGACY'
         )`
    );

    const [after] = await pool.query('SELECT COUNT(*) AS total FROM fruits');
    const [salesAfter] = await pool.query('SELECT COUNT(*) AS total FROM sales');
    const [foreignKeysAfter] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
         AND REFERENCED_TABLE_NAME IN ('fruits', 'suppliers', 'vendors', 'purchases', 'sales')`
    );
    const [statusCounts] = await pool.query(
      'SELECT status, COUNT(*) AS total FROM fruits GROUP BY status ORDER BY status'
    );
    const [finalColumn] = await pool.query(
      `SELECT COLUMN_TYPE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fruits' AND COLUMN_NAME = 'status'`
    );

    if (before[0].total !== after[0].total) {
      throw new Error(`Fruit row count changed during migration: ${before[0].total} -> ${after[0].total}`);
    }
    if (foreignKeysBefore[0].total !== foreignKeysAfter[0].total) {
      throw new Error(`Foreign key count changed during migration: ${foreignKeysBefore[0].total} -> ${foreignKeysAfter[0].total}`);
    }
    if (salesBefore[0].total !== salesAfter[0].total) {
      throw new Error(`Sale row count changed during migration: ${salesBefore[0].total} -> ${salesAfter[0].total}`);
    }

    const [paymentMismatches] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM sales s
       LEFT JOIN (
         SELECT sale_id, SUM(amount) AS total_paid
         FROM sale_payment_entries
         GROUP BY sale_id
       ) p ON p.sale_id = s.sale_id
       WHERE COALESCE(p.total_paid, 0) <> s.amount_paid`
    );
    if (paymentMismatches[0].total > 0) {
      throw new Error(`Payment history totals do not match ${paymentMismatches[0].total} sale record(s); migration aborted`);
    }

    console.log(JSON.stringify({
      fruitRows: after[0].total,
      salesRows: salesAfter[0].total,
      foreignKeys: foreignKeysAfter[0].total,
      legacyPaymentEntries: legacyBackfill.affectedRows,
      paymentMismatches: paymentMismatches[0].total,
      statusColumn: finalColumn[0],
      statusCounts,
    }));
  } finally {
    await pool.end();
  }
};

main().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
