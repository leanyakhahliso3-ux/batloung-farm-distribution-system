const { pool } = require('../config/db');
const { isPackagingSize } = require('../utils/validation');

const combinePurchaseItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one purchase item is required');
    err.statusCode = 400;
    throw err;
  }

  const combined = new Map();
  for (const item of items) {
    const fruitId = Number(item.fruit_id);
    const size = item.packaging_size;
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unit_cost);

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
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      const err = new Error('Item unit cost must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }

    const key = `${fruitId}|${size}`;
    if (!combined.has(key)) {
      combined.set(key, { fruit_id: fruitId, packaging_size: size, quantity: 0, total_cost: 0 });
    }
    const current = combined.get(key);
    current.quantity += quantity;
    current.total_cost += quantity * unitCost;
  }

  return Array.from(combined.values()).map((item) => ({
    fruit_id: item.fruit_id,
    packaging_size: item.packaging_size,
    quantity: item.quantity,
    unit_cost: item.total_cost / item.quantity,
    total_cost: item.total_cost,
  }));
};

const getAllPurchases = async () => {
  const [rows] = await pool.query(
    `SELECT
       p.purchase_id, p.supplier_id, s.business_name, p.purchase_date, p.total_amount,
       COALESCE(SUM(pd.quantity), 0) AS total_boxes,
       COALESCE(GROUP_CONCAT(CONCAT(f.fruit_name, ' (', pd.packaging_size, ' x', pd.quantity, ')') SEPARATOR ', '), '') AS items
     FROM purchases p
     JOIN suppliers s ON p.supplier_id = s.supplier_id
     LEFT JOIN purchase_details pd ON p.purchase_id = pd.purchase_id
     LEFT JOIN fruits f ON pd.fruit_id = f.fruit_id
     GROUP BY p.purchase_id, p.supplier_id, s.business_name, p.purchase_date, p.total_amount
     ORDER BY p.purchase_id DESC`
  );
  return rows;
};

const findSupplierByName = async (name) => {
  const [rows] = await pool.query(
    'SELECT supplier_id, business_name FROM suppliers WHERE LOWER(business_name) = LOWER(?) LIMIT 1',
    [String(name).trim()]
  );
  return rows[0] || null;
};

const findFruitByName = async (name) => {
  const [rows] = await pool.query(
    'SELECT fruit_id, fruit_name FROM fruits WHERE LOWER(fruit_name) = LOWER(?) LIMIT 1',
    [String(name).trim()]
  );
  return rows[0] || null;
};

const createPurchaseTransaction = async ({ supplier_id, items, purchase_date }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [suppliers] = await conn.query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [supplier_id]);
    if (suppliers.length === 0) {
      const err = new Error('Supplier not found');
      err.statusCode = 404;
      throw err;
    }

    const normalizedItems = combinePurchaseItems(items);
    let totalAmount = 0;
    for (const item of normalizedItems) {
      totalAmount += item.total_cost;
    }

    const [purchaseRes] = await conn.query(
      `INSERT INTO purchases (supplier_id, total_amount, purchase_date)
       VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [supplier_id, totalAmount, purchase_date || null]
    );
    const purchaseId = purchaseRes.insertId;

    for (const item of normalizedItems) {
      const qty = Number(item.quantity);
      const unitCost = Number(item.unit_cost);
      const size = item.packaging_size;
      const fruitId = Number(item.fruit_id);

      const [fruits] = await conn.query('SELECT fruit_id FROM fruits WHERE fruit_id = ?', [fruitId]);
      if (fruits.length === 0) {
        const err = new Error(`Fruit ID ${fruitId} does not exist`);
        err.statusCode = 400;
        throw err;
      }

      await conn.query(
        `INSERT INTO purchase_details (purchase_id, fruit_id, packaging_size, quantity, unit_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, fruitId, size, qty, unitCost]
      );

      const [stockUpdate] = await conn.query(
        `UPDATE stock
         SET available_quantity = available_quantity + ?
         WHERE fruit_id = ? AND packaging_size = ?`,
        [qty, fruitId, size]
      );

      if (stockUpdate.affectedRows === 0) {
        const err = new Error(`Stock entry not found for fruit ID ${fruitId} (${size}); add stock pricing before recording this purchase`);
        err.statusCode = 400;
        throw err;
      }
    }

    await conn.commit();
    return { purchase_id: purchaseId, supplier_id, total_amount: totalAmount, items_count: normalizedItems.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  getAllPurchases,
  findSupplierByName,
  findFruitByName,
  createPurchaseTransaction,
};
