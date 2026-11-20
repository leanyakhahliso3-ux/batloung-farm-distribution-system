const { pool } = require('../config/db');

const getAllFruits = async () => {
  const [rows] = await pool.query(
    `SELECT
       f.fruit_id, f.fruit_name, f.description, f.status,
       COALESCE(SUM(s.available_quantity), 0) AS total_stock,
       COALESCE(MAX(CASE WHEN s.packaging_size = 'small' THEN s.selling_price END), 0) AS small_price,
       COALESCE(MAX(CASE WHEN s.packaging_size = 'medium' THEN s.selling_price END), 0) AS medium_price,
       COALESCE(MAX(CASE WHEN s.packaging_size = 'large' THEN s.selling_price END), 0) AS large_price
     FROM fruits f
     LEFT JOIN stock s ON f.fruit_id = s.fruit_id
     GROUP BY f.fruit_id, f.fruit_name, f.description, f.status
     ORDER BY f.fruit_id ASC`
  );
  return rows;
};

const getFruitById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
       f.fruit_id, f.fruit_name, f.description, f.status,
       COALESCE(SUM(s.available_quantity), 0) AS total_stock
     FROM fruits f
     LEFT JOIN stock s ON f.fruit_id = s.fruit_id
     WHERE f.fruit_id = ?
     GROUP BY f.fruit_id, f.fruit_name, f.description, f.status`,
    [id]
  );
  return rows[0] || null;
};

const createFruitWithStock = async ({ fruit_name, description, status = 'AVAILABLE', prices = {} }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [fruitResult] = await conn.query(
      'INSERT INTO fruits (fruit_name, description, status) VALUES (?, ?, ?)',
      [fruit_name, description || null, status]
    );
    const fruitId = fruitResult.insertId;

    const sizePrices = [
      ['small', prices.small ?? 80],
      ['medium', prices.medium ?? 150],
      ['large', prices.large ?? 250],
    ];

    for (const [size, price] of sizePrices) {
      await conn.query(
        `INSERT INTO stock (fruit_id, packaging_size, selling_price, available_quantity)
         VALUES (?, ?, ?, 0)`,
        [fruitId, size, price]
      );
    }

    await conn.commit();
    return getFruitById(fruitId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateFruit = async (id, fields) => {
  const current = await getFruitById(id);
  if (!current) return null;

  const fruitName = fields.fruit_name ?? current.fruit_name;
  const description = Object.prototype.hasOwnProperty.call(fields, 'description')
    ? fields.description || null
    : current.description;
  const status = fields.status ?? current.status;

  const [result] = await pool.query(
    'UPDATE fruits SET fruit_name = ?, description = ?, status = ? WHERE fruit_id = ?',
    [fruitName, description, status, id]
  );
  if (result.affectedRows === 0) return null;
  return getFruitById(id);
};

const deactivateFruit = async (id) => {
  const [result] = await pool.query(
    "UPDATE fruits SET status = 'UNAVAILABLE' WHERE fruit_id = ?",
    [id]
  );
  return result.affectedRows > 0;
};

const getStockByPackaging = async (packagingSize) => {
  let sql = `
    SELECT s.stock_id, s.fruit_id, f.fruit_name, s.packaging_size, s.selling_price, s.available_quantity
    FROM stock s
    JOIN fruits f ON s.fruit_id = f.fruit_id
  `;
  const params = [];
  if (packagingSize) {
    sql += ' WHERE s.packaging_size = ?';
    params.push(packagingSize);
  }
  sql += ' ORDER BY f.fruit_name ASC, FIELD(s.packaging_size, "small", "medium", "large")';
  const [rows] = await pool.query(sql, params);
  return rows;
};

const getLowStock = async (threshold = 10) => {
  const [rows] = await pool.query(
    `SELECT s.stock_id, s.fruit_id, f.fruit_name, s.packaging_size, s.selling_price, s.available_quantity
     FROM stock s
     JOIN fruits f ON s.fruit_id = f.fruit_id
     WHERE s.available_quantity < ?
     ORDER BY s.available_quantity ASC`,
    [threshold]
  );
  return rows;
};

const updateStockPrice = async (stockId, sellingPrice) => {
  const [result] = await pool.query(
    'UPDATE stock SET selling_price = ? WHERE stock_id = ?',
    [sellingPrice, stockId]
  );
  return result.affectedRows > 0;
};

const updateStockQuantity = async (stockId, quantity) => {
  const [result] = await pool.query(
    'UPDATE stock SET available_quantity = ? WHERE stock_id = ?',
    [quantity, stockId]
  );
  return result.affectedRows > 0;
};

const updateStockDetails = async (stockId, { sellingPrice, quantity }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (sellingPrice !== undefined) {
      await conn.query(
        'UPDATE stock SET selling_price = ? WHERE stock_id = ?',
        [sellingPrice, stockId]
      );
    }

    if (quantity !== undefined) {
      await conn.query(
        'UPDATE stock SET available_quantity = ? WHERE stock_id = ?',
        [quantity, stockId]
      );
    }

    const [rows] = await conn.query(
      `SELECT stock_id, fruit_id, packaging_size, selling_price, available_quantity
       FROM stock WHERE stock_id = ?`,
      [stockId]
    );

    await conn.commit();
    return rows[0] || null;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  getAllFruits,
  getFruitById,
  createFruitWithStock,
  updateFruit,
  deactivateFruit,
  getStockByPackaging,
  getLowStock,
  updateStockPrice,
  updateStockQuantity,
  updateStockDetails,
};
