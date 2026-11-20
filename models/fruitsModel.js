const { db } = require('../config/db');

async function list() {
    const [rows] = await db.query('SELECT * FROM fruits ORDER BY fruit_id DESC');
    return rows;
}

async function findById(id) {
    const [rows] = await db.query('SELECT * FROM fruits WHERE fruit_id = ?', [id]);
    return rows[0] || null;
}

async function insert(values) {
    const [result] = await db.query(
        `INSERT INTO fruits (fruit_name, description, status)
         VALUES (?, ?, ?)`,
        [values.fruit_name, values.description, values.status]
    );
    return result.insertId;
}

async function update(id, values) {
    const [result] = await db.query(
        `UPDATE fruits
         SET fruit_name = ?, description = ?, status = ?
         WHERE fruit_id = ?`,
        [values.fruit_name, values.description, values.status, id]
    );
    return result.affectedRows;
}

async function remove(id) {
    const [result] = await db.query('DELETE FROM fruits WHERE fruit_id = ?', [id]);
    return result.affectedRows;
}

module.exports = {
    list,
    findById,
    insert,
    update,
    remove
};
