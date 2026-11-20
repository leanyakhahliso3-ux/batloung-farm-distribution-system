const { db } = require('../config/db');

async function getSummary(threshold) {
    const [rows] = await db.query(`
        SELECT
            (SELECT COUNT(*) FROM suppliers) AS total_suppliers,
            (SELECT COUNT(*) FROM fruits) AS total_fruits,
            (SELECT COUNT(*) FROM vendors) AS total_vendors,
            (SELECT COUNT(*) FROM purchases) AS total_purchases,
            (SELECT COUNT(*) FROM sales) AS total_sales,
            (SELECT COUNT(*) FROM stock WHERE available_quantity <= ?) AS low_stock_items,
            (SELECT COALESCE(SUM(available_quantity), 0) FROM stock) AS boxes_in_stock,
            (SELECT COALESCE(SUM(total_amount), 0) FROM purchases) AS purchase_total,
            (SELECT COALESCE(SUM(total_amount), 0) FROM sales) AS sale_total,
            (SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0) FROM purchases) AS purchase_balance,
            (SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0) FROM sales) AS sale_balance
    `, [threshold]);
    return rows[0];
}

async function getRecentTransactions() {
    const [rows] = await db.query(`
        SELECT * FROM (
            SELECT 'Purchase' AS type,
                   CONCAT('PUR-', LPAD(p.purchase_id, 4, '0')) AS reference,
                   s.business_name AS name,
                   p.purchase_date AS date,
                   p.total_amount AS amount,
                   p.payment_status AS status
            FROM purchases p
            INNER JOIN suppliers s ON p.supplier_id = s.supplier_id

            UNION ALL

            SELECT 'Sale' AS type,
                   CONCAT('SAL-', LPAD(sa.sale_id, 4, '0')) AS reference,
                   v.vendor_name AS name,
                   sa.sale_date AS date,
                   sa.total_amount AS amount,
                   sa.payment_status AS status
            FROM sales sa
            INNER JOIN vendors v ON sa.vendor_id = v.vendor_id
        ) AS recent
        ORDER BY date DESC, reference DESC
        LIMIT 8
    `);
    return rows;
}

async function getStockAlerts(threshold) {
    const [rows] = await db.query(`
        SELECT s.stock_id, s.fruit_id, f.fruit_name,
               s.packaging_size, s.available_quantity
        FROM stock s
        INNER JOIN fruits f ON s.fruit_id = f.fruit_id
        WHERE s.available_quantity <= ?
        ORDER BY s.available_quantity ASC
        LIMIT 6
    `, [threshold]);
    return rows;
}

async function topFruits(limit) {
    const [rows] = await db.query(`
        SELECT f.fruit_id, f.fruit_name,
               COALESCE(SUM(sd.quantity), 0) AS boxes_sold,
               COALESCE(SUM(sd.quantity * sd.unit_price), 0) AS revenue,
               COUNT(DISTINCT sd.sale_id) AS sale_count
        FROM sales_details sd
        INNER JOIN fruits f ON sd.fruit_id = f.fruit_id
        GROUP BY f.fruit_id, f.fruit_name
        ORDER BY boxes_sold DESC, revenue DESC
        LIMIT ?
    `, [limit]);
    return rows;
}

async function salesRevenue(startDate, endDate) {
    const [rows] = await db.query(`
        SELECT COUNT(*) AS total_sales,
               COALESCE(SUM(total_amount), 0) AS total_revenue,
               COALESCE(SUM(amount_paid), 0) AS total_received
        FROM sales
        WHERE sale_date BETWEEN ? AND ?
    `, [startDate, endDate]);
    return rows[0];
}

async function topVendor() {
    const [rows] = await db.query(`
        SELECT v.vendor_id, v.vendor_name, v.location,
               COALESCE(SUM(sd.quantity), 0) AS boxes_purchased,
               COUNT(DISTINCT s.sale_id) AS sale_count,
               COALESCE(SUM(sd.quantity * sd.unit_price), 0) AS total_spent
        FROM sales s
        INNER JOIN vendors v ON s.vendor_id = v.vendor_id
        INNER JOIN sales_details sd ON sd.sale_id = s.sale_id
        GROUP BY v.vendor_id, v.vendor_name, v.location
        ORDER BY boxes_purchased DESC, total_spent DESC
        LIMIT 1
    `);
    return rows[0] || null;
}

async function stockLevels() {
    const [rows] = await db.query(`
        SELECT f.fruit_id, f.fruit_name, sizes.packaging_size,
               COALESCE(st.available_quantity, 0) AS available_quantity
        FROM fruits f
        CROSS JOIN (
            SELECT 'SMALL' AS packaging_size
            UNION ALL SELECT 'MEDIUM'
            UNION ALL SELECT 'LARGE'
        ) AS sizes
        LEFT JOIN stock st
               ON st.fruit_id = f.fruit_id
              AND st.packaging_size = sizes.packaging_size
        ORDER BY f.fruit_name ASC,
                 FIELD(sizes.packaging_size, 'SMALL', 'MEDIUM', 'LARGE')
    `);
    return rows;
}

module.exports = {
    getSummary,
    getRecentTransactions,
    getStockAlerts,
    topFruits,
    salesRevenue,
    topVendor,
    stockLevels
};
