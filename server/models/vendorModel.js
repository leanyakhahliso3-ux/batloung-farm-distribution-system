const { pool } = require('../config/db');

const getAllVendors = async (search = '') => {
  let sql = `
    SELECT
      v.vendor_id,
      v.vendor_name,
      v.phone_number,
      v.location,
      v.registration_date,
      COALESCE(SUM(s.balance_due), 0) AS outstanding_balance
    FROM vendors v
    LEFT JOIN sales s ON v.vendor_id = s.vendor_id
  `;
  const params = [];

  if (search) {
    sql += ' WHERE v.vendor_name LIKE ? OR v.phone_number LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' GROUP BY v.vendor_id ORDER BY v.vendor_id DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

const getVendorById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
      v.vendor_id,
      v.vendor_name,
      v.phone_number,
      v.location,
      v.registration_date,
      COALESCE(SUM(s.balance_due), 0) AS outstanding_balance
     FROM vendors v
     LEFT JOIN sales s ON v.vendor_id = s.vendor_id
     WHERE v.vendor_id = ?
     GROUP BY v.vendor_id`,
    [id]
  );
  return rows[0] || null;
};

const createVendor = async ({ vendor_name, phone_number, location, registration_date }) => {
  const [result] = await pool.query(
    `INSERT INTO vendors (vendor_name, phone_number, location, registration_date)
     VALUES (?, ?, ?, COALESCE(?, CURRENT_DATE))`,
    [vendor_name, phone_number, location, registration_date || null]
  );
  return getVendorById(result.insertId);
};

const updateVendor = async (id, { vendor_name, phone_number, location, registration_date }) => {
  const [result] = await pool.query(
    `UPDATE vendors
     SET vendor_name = ?, phone_number = ?, location = ?, registration_date = COALESCE(?, registration_date)
     WHERE vendor_id = ?`,
    [vendor_name, phone_number, location, registration_date || null, id]
  );
  if (result.affectedRows === 0) return null;
  return getVendorById(id);
};

const deleteVendor = async (id) => {
  const [result] = await pool.query('DELETE FROM vendors WHERE vendor_id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
};
