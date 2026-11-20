const { pool } = require('../config/db');
const { isPackagingSize } = require('../utils/validation');

const combineSaleItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one sale item is required');
    err.statusCode = 400;
    throw err;
  }

  const combined = new Map();
  for (const item of items) {
    const fruitId = Number(item.fruit_id);
    const size = item.packaging_size;
    const quantity = Number(item.quantity);

    if (!Number.isInteger(fruitId) || fruitId <= 0) {
      const err = new Error('Each item requires a valid fruit_id');
      err.statusCode = 400;
      throw err;
    }
    if (!isPackagingSize(size)) {
      const err = new Error('Packaging size must be small, medium, or large');
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      const err = new Error('Item quantity must be a whole number greater than zero');
      err.statusCode = 400;
      throw err;
    }

    const key = `${fruitId}|${size}`;
    if (!combined.has(key)) {
      combined.set(key, { fruit_id: fruitId, packaging_size: size, quantity: 0 });
    }
    combined.get(key).quantity += quantity;
  }

  return Array.from(combined.values());
};

const computePaymentStatus = (totalAmount, amountPaid) => {
  if (amountPaid >= totalAmount && totalAmount > 0) return 'PAID';
  if (amountPaid > 0) return 'PARTIALLY_PAID';
  return 'UNPAID';
};

const readTotalPaid = async (connection, saleId) => {
  const [rows] = await connection.query(
    'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM sale_payment_entries WHERE sale_id = ?',
    [saleId]
  );
  return Number(rows[0].total_paid);
};

const insertPaymentEntry = async (connection, saleId, { entry_type, amount, payment_method, entry_date = null }) => {
  await connection.query(
    `INSERT INTO sale_payment_entries (sale_id, entry_type, amount, payment_method, entry_date)
     VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
    [saleId, entry_type, amount, payment_method, entry_date]
  );
};

const getPaymentHistory = async (saleId) => {
  const [sales] = await pool.query('SELECT sale_id FROM sales WHERE sale_id = ?', [saleId]);
  if (sales.length === 0) return null;

  const [entries] = await pool.query(
    `SELECT entry_id, sale_id, entry_type, amount, payment_method, entry_date
     FROM sale_payment_entries
     WHERE sale_id = ?
     ORDER BY entry_date ASC, entry_id ASC`,
    [saleId]
  );
  return entries;
};

const getAllSales = async () => {
  const [rows] = await pool.query(
    `SELECT
      s.sale_id, s.vendor_id, v.vendor_name, s.sale_date,
      s.payment_method, s.payment_status, s.total_amount, s.amount_paid, s.balance_due,
      COALESCE(SUM(sd.quantity), 0) AS total_boxes,
      COALESCE(GROUP_CONCAT(CONCAT(f.fruit_name, ' (', sd.packaging_size, ' x', sd.quantity, ')') SEPARATOR ', '), '') AS items
     FROM sales s
     JOIN vendors v ON s.vendor_id = v.vendor_id
     LEFT JOIN sales_details sd ON s.sale_id = sd.sale_id
     LEFT JOIN fruits f ON sd.fruit_id = f.fruit_id
     GROUP BY s.sale_id, s.vendor_id, v.vendor_name, s.sale_date,
              s.payment_method, s.payment_status, s.total_amount, s.amount_paid, s.balance_due
     ORDER BY s.sale_id DESC`
  );
  return rows;
};

const findVendorByName = async (name) => {
  const [rows] = await pool.query(
    'SELECT vendor_id, vendor_name FROM vendors WHERE LOWER(vendor_name) = LOWER(?) LIMIT 1',
    [String(name).trim()]
  );
  return rows[0] || null;
};


const createSaleTransaction = async ({ vendor_id, payment_method = 'CASH', amount_paid = 0, items, sale_date }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [vendors] = await conn.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendor_id]);
    if (vendors.length === 0) {
      const err = new Error('Selected vendor does not exist');
      err.statusCode = 404;
      throw err;
    }

    const normalizedItems = combineSaleItems(items);
    let totalAmount = 0;
    const pricedItems = [];

    for (const item of normalizedItems) {
      const fruitId = Number(item.fruit_id);
      const size = item.packaging_size;
      const qty = Number(item.quantity);

      const [stockRows] = await conn.query(
        `SELECT s.stock_id, s.selling_price, s.available_quantity, f.fruit_name, f.status
         FROM stock s
         JOIN fruits f ON s.fruit_id = f.fruit_id
         WHERE s.fruit_id = ? AND s.packaging_size = ?
         FOR UPDATE`,
        [fruitId, size]
      );

      if (stockRows.length === 0) {
        const err = new Error(`Stock entry not found for fruit ID ${fruitId} (${size})`);
        err.statusCode = 400;
        throw err;
      }

      const stockRecord = stockRows[0];
      if (stockRecord.status !== 'AVAILABLE') {
        const err = new Error(`${stockRecord.fruit_name} is currently unavailable`);
        err.statusCode = 400;
        throw err;
      }
      if (stockRecord.available_quantity < qty) {
        const err = new Error(
          `Insufficient stock for ${stockRecord.fruit_name} (${size}): requested ${qty}, available ${stockRecord.available_quantity}. Transaction rolled back.`
        );
        err.statusCode = 400;
        throw err;
      }

      const unitPrice = Number(stockRecord.selling_price);
      totalAmount += unitPrice * qty;
      pricedItems.push({
        fruit_id: fruitId,
        packaging_size: size,
        quantity: qty,
        unit_price: unitPrice,
      });
    }

    const paid = Number(amount_paid) || 0;
    if (paid < 0 || paid > totalAmount + 0.0001) {
      const err = new Error('Amount paid cannot be negative or exceed the total sale amount');
      err.statusCode = 400;
      throw err;
    }

    const paymentStatus = computePaymentStatus(totalAmount, paid);

    const [saleRes] = await conn.query(
      `INSERT INTO sales (vendor_id, payment_method, payment_status, total_amount, amount_paid, sale_date)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [vendor_id, payment_method, paymentStatus, totalAmount, paid, sale_date || null]
    );
    const saleId = saleRes.insertId;

    if (paid > 0) {
      await insertPaymentEntry(conn, saleId, {
        entry_type: 'PAYMENT',
        amount: paid,
        payment_method,
        entry_date: sale_date || null,
      });
    }

    for (const pItem of pricedItems) {
      await conn.query(
        `INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, pItem.fruit_id, pItem.packaging_size, pItem.quantity, pItem.unit_price]
      );

      await conn.query(
        `UPDATE stock
         SET available_quantity = available_quantity - ?
         WHERE fruit_id = ? AND packaging_size = ?`,
        [pItem.quantity, pItem.fruit_id, pItem.packaging_size]
      );
    }

    await conn.commit();
    return {
      sale_id: saleId,
      vendor_id,
      payment_method,
      payment_status: paymentStatus,
      total_amount: totalAmount,
      amount_paid: paid,
      balance_due: Math.max(0, totalAmount - paid),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateSalePayment = async (saleId, { payment_method, amount_paid }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM sales WHERE sale_id = ? FOR UPDATE', [saleId]);
    if (rows.length === 0) {
      await conn.rollback();
      return null;
    }

    const sale = rows[0];
    const newPaid = Number(amount_paid);
    const total = Number(sale.total_amount);

    if (!Number.isFinite(newPaid) || newPaid < 0 || newPaid > total + 0.0001) {
      const err = new Error('Invalid payment amount');
      err.statusCode = 400;
      throw err;
    }

    const method = payment_method || sale.payment_method;
    let currentPaid = await readTotalPaid(conn, saleId);
    const storedPaid = Number(sale.amount_paid);

    if (Math.abs(currentPaid - storedPaid) > 0.0001) {
      if (Math.abs(currentPaid) > 0.0001 || storedPaid <= 0) {
        const err = new Error('Payment history total does not match the sale record');
        err.statusCode = 400;
        throw err;
      }
      await insertPaymentEntry(conn, saleId, {
        entry_type: 'LEGACY',
        amount: storedPaid,
        payment_method: sale.payment_method,
        entry_date: sale.sale_date,
      });
      currentPaid = storedPaid;
    }

    const difference = Math.round((newPaid - currentPaid) * 100) / 100;
    if (difference !== 0) {
      await insertPaymentEntry(conn, saleId, {
        entry_type: difference > 0 ? 'PAYMENT' : 'ADJUSTMENT',
        amount: difference,
        payment_method: method,
      });
    }

    const cumulativePaid = Math.round(await readTotalPaid(conn, saleId) * 100) / 100;
    if (cumulativePaid < -0.0001 || cumulativePaid > total + 0.0001) {
      const err = new Error('Payment history total is outside the sale amount');
      err.statusCode = 400;
      throw err;
    }

    const status = computePaymentStatus(total, cumulativePaid);
    await conn.query(
      'UPDATE sales SET payment_method = ?, amount_paid = ?, payment_status = ? WHERE sale_id = ?',
      [method, cumulativePaid, status, saleId]
    );

    await conn.commit();
    const [updated] = await pool.query('SELECT * FROM sales WHERE sale_id = ?', [saleId]);
    return updated[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const addSalePayment = async (saleId, { payment_method, amount }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM sales WHERE sale_id = ? FOR UPDATE', [saleId]);
    if (rows.length === 0) {
      await conn.rollback();
      return null;
    }

    const sale = rows[0];
    const total = Number(sale.total_amount);
    const paymentAmount = Math.round(Number(amount) * 100) / 100;

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      const err = new Error('Payment amount must be greater than zero');
      err.statusCode = 400;
      throw err;
    }

    const method = payment_method || sale.payment_method;
    let currentPaid = await readTotalPaid(conn, saleId);
    const storedPaid = Number(sale.amount_paid);

    if (Math.abs(currentPaid - storedPaid) > 0.0001) {
      if (Math.abs(currentPaid) > 0.0001 || storedPaid <= 0) {
        const err = new Error('Payment history total does not match the sale record');
        err.statusCode = 400;
        throw err;
      }
      await insertPaymentEntry(conn, saleId, {
        entry_type: 'LEGACY',
        amount: storedPaid,
        payment_method: sale.payment_method,
        entry_date: sale.sale_date,
      });
      currentPaid = storedPaid;
    }

    const cumulativePaid = Math.round((currentPaid + paymentAmount) * 100) / 100;
    if (cumulativePaid > total + 0.0001) {
      const err = new Error('Payment cannot exceed the outstanding balance');
      err.statusCode = 400;
      throw err;
    }

    await insertPaymentEntry(conn, saleId, {
      entry_type: 'PAYMENT',
      amount: paymentAmount,
      payment_method: method,
    });

    const status = computePaymentStatus(total, cumulativePaid);
    await conn.query(
      'UPDATE sales SET payment_method = ?, amount_paid = ?, payment_status = ? WHERE sale_id = ?',
      [method, cumulativePaid, status, saleId]
    );

    await conn.commit();
    const [updated] = await pool.query('SELECT * FROM sales WHERE sale_id = ?', [saleId]);
    return updated[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  getPaymentHistory,
  getAllSales,
  findVendorByName,
  createSaleTransaction,
  updateSalePayment,
  addSalePayment,
};
