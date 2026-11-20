const { pool } = require('../config/db');

const getAllSuppliers = async () => {
  const [rows] = await pool.query('SELECT * FROM suppliers ORDER BY supplier_id DESC');
  return rows;
};

const getSupplierById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE supplier_id = ?', [id]);
  return rows[0] || null;
};

const createSupplier = async ({ business_name, contact_person, phone, province, address }) => {
  const [result] = await pool.query(
    `INSERT INTO suppliers (business_name, contact_person, phone, province, address)
     VALUES (?, ?, ?, ?, ?)`,
    [business_name, contact_person, phone, province, address]
  );
  return getSupplierById(result.insertId);
};

const updateSupplier = async (id, { business_name, contact_person, phone, province, address }) => {
  const [result] = await pool.query(
    `UPDATE suppliers
     SET business_name = ?, contact_person = ?, phone = ?, province = ?, address = ?
     WHERE supplier_id = ?`,
    [business_name, contact_person, phone, province, address, id]
  );
  if (result.affectedRows === 0) return null;
  return getSupplierById(id);
};

const deleteSupplier = async (id) => {
  const [result] = await pool.query('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
