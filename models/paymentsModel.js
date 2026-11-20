const { db } = require('../config/db');
const { calculatePaymentStatus } = require('../utils/apiHelpers');

function tableFor(type) {
    return type === 'purchase'
        ? { table: 'purchases', idColumn: 'purchase_id', refColumn: 'purchase_id' }
        : { table: 'sales', idColumn: 'sale_id', refColumn: 'sale_id' };
}

function statusForPayment(amountPaid, totalAmount) {
    return calculatePaymentStatus(amountPaid, totalAmount);
}

async function list(status) {
    const [rows] = await db.query(`
        SELECT * FROM (
            SELECT 'Purchase' AS type,
                   p.purchase_id AS id,
                   CONCAT('PUR-', LPAD(p.purchase_id, 4, '0')) AS reference,
                   s.business_name AS name,
                   p.purchase_date AS date,
                   p.total_amount,
                   p.amount_paid,
                   (p.total_amount - p.amount_paid) AS balance,
                   p.payment_status,
                   p.payment_method
            FROM purchases p
            INNER JOIN suppliers s ON p.supplier_id = s.supplier_id

            UNION ALL

            SELECT 'Sale' AS type,
                   sa.sale_id AS id,
                   CONCAT('SAL-', LPAD(sa.sale_id, 4, '0')) AS reference,
                   v.vendor_name AS name,
                   sa.sale_date AS date,
                   sa.total_amount,
                   sa.amount_paid,
                   (sa.total_amount - sa.amount_paid) AS balance,
                   sa.payment_status,
                   sa.payment_method
            FROM sales sa
            INNER JOIN vendors v ON sa.vendor_id = v.vendor_id
        ) AS payment_list
        ${status ? 'WHERE payment_status = ?' : ''}
        ORDER BY date DESC, id DESC
    `, status ? [status] : []);

    return rows;
}

async function lockRecord(connection, type, id) {
    const { table, idColumn } = tableFor(type);
    const [rows] = await connection.query(
        `SELECT ${idColumn} AS id, total_amount, amount_paid, payment_method, payment_status
         FROM ${table}
         WHERE ${idColumn} = ?
         FOR UPDATE`,
        [id]
    );
    return rows[0] || null;
}

async function findByReference(connection, reference) {
    const [rows] = await connection.query(
        `SELECT payment_id, purchase_id, sale_id, amount,
                payment_method, payment_reference, paid_at
         FROM payments
         WHERE payment_reference = ?`,
        [reference]
    );
    return rows[0] || null;
}

async function recordPayment(connection, values) {
    const [result] = await connection.query(
        `INSERT INTO payments
         (purchase_id, sale_id, amount, payment_method, payment_reference, paid_at, recorded_by)
         VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
        [
            values.type === 'purchase' ? values.id : null,
            values.type === 'sale' ? values.id : null,
            values.amount,
            values.payment_method,
            values.payment_reference,
            values.recorded_by || null
        ]
    );
    return result.insertId;
}

async function setHeaderPayment(connection, type, id, amountPaid, paymentStatus, paymentMethod) {
    const { table, idColumn } = tableFor(type);
    await connection.query(
        `UPDATE ${table}
         SET amount_paid = ?, payment_status = ?, payment_method = ?
         WHERE ${idColumn} = ?`,
        [amountPaid, paymentStatus, paymentMethod, id]
    );
}

async function history(type, id) {
    const column = type === 'purchase' ? 'purchase_id' : 'sale_id';
    const [rows] = await db.query(
        `SELECT p.payment_id, p.amount, p.payment_method, p.payment_reference,
                p.paid_at, u.username AS recorded_by
         FROM payments p
         LEFT JOIN users u ON p.recorded_by = u.user_id
         WHERE p.${column} = ?
         ORDER BY p.paid_at DESC, p.payment_id DESC`,
        [id]
    );
    return rows;
}

async function vendorBalances() {
    const [rows] = await db.query(`
        SELECT v.vendor_id, v.vendor_name, v.location,
               COUNT(s.sale_id) AS sale_count,
               COALESCE(SUM(s.total_amount), 0) AS total_sales,
               COALESCE(SUM(s.amount_paid), 0) AS total_paid,
               COALESCE(SUM(s.total_amount - s.amount_paid), 0) AS outstanding_balance
        FROM vendors v
        LEFT JOIN sales s ON s.vendor_id = v.vendor_id
        GROUP BY v.vendor_id, v.vendor_name, v.location
        ORDER BY outstanding_balance DESC, v.vendor_name ASC
    `);
    return rows;
}

async function supplierBalances() {
    const [rows] = await db.query(`
        SELECT s.supplier_id, s.business_name AS supplier_name, s.province,
               COUNT(p.purchase_id) AS purchase_count,
               COALESCE(SUM(p.total_amount), 0) AS total_purchases,
               COALESCE(SUM(p.amount_paid), 0) AS total_paid,
               COALESCE(SUM(p.total_amount - p.amount_paid), 0) AS outstanding_balance
        FROM suppliers s
        LEFT JOIN purchases p ON p.supplier_id = s.supplier_id
        GROUP BY s.supplier_id, s.business_name, s.province
        ORDER BY outstanding_balance DESC, s.business_name ASC
    `);
    return rows;
}

module.exports = {
    statusForPayment,
    list,
    lockRecord,
    findByReference,
    recordPayment,
    setHeaderPayment,
    history,
    vendorBalances,
    supplierBalances
};
