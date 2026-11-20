const { db } = require('../config/db');

async function list() {
    const [rows] = await db.query('SELECT * FROM suppliers ORDER BY supplier_id DESC');
    return rows;
}

async function findById(id) {
    const [rows] = await db.query('SELECT * FROM suppliers WHERE supplier_id = ?', [id]);
    return rows[0] || null;
}

async function insert(values) {
    const [result] = await db.query(
        `INSERT INTO suppliers (business_name, contact_person, phone, province, address)
         VALUES (?, ?, ?, ?, ?)`,
        [
            values.business_name,
            values.contact_person,
            values.phone,
            values.province,
            values.address
        ]
    );
    return result.insertId;
}

async function update(id, values) {
    const [result] = await db.query(
        `UPDATE suppliers
         SET business_name = ?, contact_person = ?, phone = ?, province = ?, address = ?
         WHERE supplier_id = ?`,
        [
            values.business_name,
            values.contact_person,
            values.phone,
            values.province,
            values.address,
            id
        ]
    );
    return result.affectedRows;
}

async function remove(id) {
    const [result] = await db.query('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
    return result.affectedRows;
}

module.exports = {
    list,
    findById,
    insert,
    update,
    remove
};
