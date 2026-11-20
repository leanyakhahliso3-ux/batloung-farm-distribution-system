const { db } = require('../config/db');
const { centsToDecimalString } = require('../utils/apiHelpers');

async function list() {
    const [rows] = await db.query(`
        SELECT p.purchase_id, p.supplier_id, s.business_name AS supplier_name,
               p.purchase_date, p.total_amount, p.payment_method,
               p.payment_status, COALESCE(p.amount_paid, 0) AS amount_paid,
               (p.total_amount - COALESCE(p.amount_paid, 0)) AS balance,
               (SELECT COUNT(*) FROM purchase_details pd
                WHERE pd.purchase_id = p.purchase_id) AS item_count
        FROM purchases p
        INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
        ORDER BY p.purchase_date DESC, p.purchase_id DESC
    `);
    return rows;
}

async function findById(id) {
    const [rows] = await db.query(`
        SELECT p.purchase_id, p.supplier_id, s.business_name AS supplier_name,
               p.purchase_date, p.total_amount, p.payment_method,
               p.payment_status, COALESCE(p.amount_paid, 0) AS amount_paid,
               (p.total_amount - COALESCE(p.amount_paid, 0)) AS balance
        FROM purchases p
        INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
        WHERE p.purchase_id = ?
    `, [id]);
    return rows[0] || null;
}

async function findByIdForUpdate(connection, id) {
    const [rows] = await connection.query(
        'SELECT purchase_id, supplier_id, total_amount, amount_paid FROM purchases WHERE purchase_id = ? FOR UPDATE',
        [id]
    );
    return rows[0] || null;
}

async function findItems(id) {
    const [rows] = await db.query(`
        SELECT pd.purchase_detail_id, pd.fruit_id, f.fruit_name,
               pd.packaging_size, pd.quantity, pd.unit_cost,
               (pd.quantity * pd.unit_cost) AS line_total
        FROM purchase_details pd
        INNER JOIN fruits f ON pd.fruit_id = f.fruit_id
        WHERE pd.purchase_id = ?
        ORDER BY pd.purchase_detail_id
    `, [id]);
    return rows;
}

async function findRawItems(connection, id) {
    const [rows] = await connection.query(
        'SELECT fruit_id, packaging_size, quantity FROM purchase_details WHERE purchase_id = ?',
        [id]
    );
    return rows;
}

async function supplierExists(connection, id) {
    const [rows] = await connection.query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [id]);
    return rows.length > 0;
}

async function fruitsExist(connection, ids) {
    const [rows] = await connection.query(
        `SELECT fruit_id FROM fruits WHERE fruit_id IN (${ids.map(() => '?').join(', ')})`,
        ids
    );
    return rows.length === ids.length;
}

async function insert(connection, values, total, amountPaid, status) {
    const [result] = await connection.query(
        `INSERT INTO purchases
         (supplier_id, purchase_date, total_amount, payment_method, payment_status, amount_paid)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            values.supplier_id,
            values.purchase_date,
            centsToDecimalString(total),
            values.payment_method,
            status,
            centsToDecimalString(amountPaid)
        ]
    );
    return result.insertId;
}

async function update(connection, id, values, total, amountPaid, status) {
    const [result] = await connection.query(
        `UPDATE purchases
         SET supplier_id = ?, purchase_date = ?, total_amount = ?,
             payment_method = ?, payment_status = ?, amount_paid = ?
         WHERE purchase_id = ?`,
        [
            values.supplier_id,
            values.purchase_date,
            centsToDecimalString(total),
            values.payment_method,
            status,
            centsToDecimalString(amountPaid),
            id
        ]
    );
    return result.affectedRows;
}

async function replaceItems(connection, id, items) {
    await connection.query('DELETE FROM purchase_details WHERE purchase_id = ?', [id]);

    for (const item of items) {
        await connection.query(
            `INSERT INTO purchase_details
             (purchase_id, fruit_id, packaging_size, quantity, unit_cost)
             VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                item.fruit_id,
                item.packaging_size,
                item.quantity,
                centsToDecimalString(item.unit_cost_cents)
            ]
        );
    }
}

async function insertItems(connection, id, items) {
    for (const item of items) {
        await connection.query(
            `INSERT INTO purchase_details
             (purchase_id, fruit_id, packaging_size, quantity, unit_cost)
             VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                item.fruit_id,
                item.packaging_size,
                item.quantity,
                centsToDecimalString(item.unit_cost_cents)
            ]
        );
    }
}

async function remove(connection, id) {
    const [result] = await connection.query('DELETE FROM purchases WHERE purchase_id = ?', [id]);
    return result.affectedRows;
}

module.exports = {
    list,
    findById,
    findByIdForUpdate,
    findItems,
    findRawItems,
    supplierExists,
    fruitsExist,
    insert,
    update,
    replaceItems,
    insertItems,
    remove
};
