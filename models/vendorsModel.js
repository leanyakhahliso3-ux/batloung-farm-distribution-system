const { db } = require('../config/db');

async function list() {
    const [rows] = await db.query('SELECT * FROM vendors ORDER BY vendor_id DESC');
    return rows;
}

async function search(keyword) {
    const searchValue = `%${keyword}%`;
    const [rows] = await db.query(
        `SELECT * FROM vendors
         WHERE vendor_name LIKE ? OR location LIKE ?
         ORDER BY vendor_id DESC`,
        [searchValue, searchValue]
    );
    return rows;
}

async function findById(id) {
    const [rows] = await db.query('SELECT * FROM vendors WHERE vendor_id = ?', [id]);
    return rows[0] || null;
}

async function insert(values) {
    const [result] = await db.query(
        `INSERT INTO vendors (vendor_name, phone_number, location, registration_date)
         VALUES (?, ?, ?, ?)`,
        [
            values.vendor_name,
            values.phone_number,
            values.location,
            values.registration_date
        ]
    );
    return result.insertId;
}

async function update(id, values) {
    const [result] = await db.query(
        `UPDATE vendors
         SET vendor_name = ?, phone_number = ?, location = ?, registration_date = ?
         WHERE vendor_id = ?`,
        [
            values.vendor_name,
            values.phone_number,
            values.location,
            values.registration_date,
            id
        ]
    );
    return result.affectedRows;
}

async function remove(id) {
    const [result] = await db.query('DELETE FROM vendors WHERE vendor_id = ?', [id]);
    return result.affectedRows;
}

module.exports = {
    list,
    search,
    findById,
    insert,
    update,
    remove
};
