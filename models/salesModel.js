const { db } = require('../config/db');
const { centsToDecimalString } = require('../utils/apiHelpers');

async function list() {
    const [rows] = await db.query(`
        SELECT s.sale_id, s.vendor_id, v.vendor_name,
               s.sale_date, s.total_amount, s.payment_method,
               s.payment_status, COALESCE(s.amount_paid, 0) AS amount_paid,
               (s.total_amount - COALESCE(s.amount_paid, 0)) AS balance,
               (SELECT COUNT(*) FROM sales_details sd
                WHERE sd.sale_id = s.sale_id) AS item_count
        FROM sales s
        INNER JOIN vendors v ON s.vendor_id = v.vendor_id
        ORDER BY s.sale_date DESC, s.sale_id DESC
    `);
    return rows;
}

async function findById(id) {
    const [rows] = await db.query(`
        SELECT s.sale_id, s.vendor_id, v.vendor_name,
               s.sale_date, s.total_amount, s.payment_method,
               s.payment_status, COALESCE(s.amount_paid, 0) AS amount_paid,
               (s.total_amount - COALESCE(s.amount_paid, 0)) AS balance
        FROM sales s
        INNER JOIN vendors v ON s.vendor_id = v.vendor_id
        WHERE s.sale_id = ?
    `, [id]);
    return rows[0] || null;
}

async function findByIdForUpdate(connection, id) {
    const [rows] = await connection.query(
        'SELECT sale_id, vendor_id, total_amount, amount_paid FROM sales WHERE sale_id = ? FOR UPDATE',
        [id]
    );
    return rows[0] || null;
}

async function findItems(id) {
    const [rows] = await db.query(`
        SELECT sd.sales_detail_id, sd.fruit_id, f.fruit_name,
               sd.packaging_size, sd.quantity, sd.unit_price,
               (sd.quantity * sd.unit_price) AS line_total
        FROM sales_details sd
        INNER JOIN fruits f ON sd.fruit_id = f.fruit_id
        WHERE sd.sale_id = ?
        ORDER BY sd.sales_detail_id
    `, [id]);
    return rows;
}

async function findRawItems(connection, id) {
    const [rows] = await connection.query(
        'SELECT fruit_id, packaging_size, quantity FROM sales_details WHERE sale_id = ?',
        [id]
    );
    return rows;
}

async function vendorExists(connection, id) {
    const [rows] = await connection.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [id]);
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
        `INSERT INTO sales
         (vendor_id, sale_date, total_amount, payment_method, payment_status, amount_paid)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            values.vendor_id,
            values.sale_date,
            centsToDecimalString(total),
            values.payment_method || 'CREDIT',
            status,
            centsToDecimalString(amountPaid)
        ]
    );
    return result.insertId;
}

async function update(connection, id, values, total, amountPaid, status) {
    const [result] = await connection.query(
        `UPDATE sales
         SET vendor_id = ?, sale_date = ?, total_amount = ?,
             payment_method = ?, payment_status = ?, amount_paid = ?
         WHERE sale_id = ?`,
        [
            values.vendor_id,
            values.sale_date,
            centsToDecimalString(total),
            values.payment_method || 'CREDIT',
            status,
            centsToDecimalString(amountPaid),
            id
        ]
    );
    return result.affectedRows;
}

async function replaceItems(connection, id, items) {
    await connection.query('DELETE FROM sales_details WHERE sale_id = ?', [id]);

    for (const item of items) {
        await connection.query(
            `INSERT INTO sales_details
             (sale_id, fruit_id, packaging_size, quantity, unit_price)
             VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                item.fruit_id,
                item.packaging_size,
                item.quantity,
                centsToDecimalString(item.unit_price_cents)
            ]
        );
    }
}

async function insertItems(connection, id, items) {
    for (const item of items) {
        await connection.query(
            `INSERT INTO sales_details
             (sale_id, fruit_id, packaging_size, quantity, unit_price)
             VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                item.fruit_id,
                item.packaging_size,
                item.quantity,
                centsToDecimalString(item.unit_price_cents)
            ]
        );
    }
}

async function remove(connection, id) {
    const [result] = await connection.query('DELETE FROM sales WHERE sale_id = ?', [id]);
    return result.affectedRows;
}

module.exports = {
    list,
    findById,
    findByIdForUpdate,
    findItems,
    findRawItems,
    vendorExists,
    fruitsExist,
    insert,
    update,
    replaceItems,
    insertItems,
    remove
};
