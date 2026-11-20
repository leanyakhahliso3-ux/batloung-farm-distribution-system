const { pool } = require('../config/db');

const getTopSoldFruits = async () => {
  const [rows] = await pool.query(
    `SELECT
      f.fruit_id,
      f.fruit_name,
      COALESCE(SUM(sd.quantity), 0) AS total_boxes_sold,
      COUNT(sd.sales_detail_id) AS order_count
     FROM fruits f
     LEFT JOIN sales_details sd ON f.fruit_id = sd.fruit_id
     GROUP BY f.fruit_id, f.fruit_name
     ORDER BY total_boxes_sold DESC, order_count DESC
     LIMIT 5`
  );
  return rows;
};

const getRevenueByDateRange = async (startDate, endDate) => {
  const [rows] = await pool.query(
    `SELECT
      COALESCE(SUM(total_amount), 0) AS total_revenue,
      COUNT(*) AS total_sales
     FROM sales
     WHERE DATE(sale_date) BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  return rows[0];
};

const getTopVendorByBoxes = async () => {
  const [rows] = await pool.query(
    `SELECT
      v.vendor_id,
      v.vendor_name,
      v.location,
      COALESCE(SUM(sd.quantity), 0) AS total_boxes
     FROM vendors v
     JOIN sales s ON v.vendor_id = s.vendor_id
     JOIN sales_details sd ON s.sale_id = sd.sale_id
     GROUP BY v.vendor_id, v.vendor_name, v.location
     ORDER BY total_boxes DESC
     LIMIT 1`
  );
  return rows[0] || null;
};

const getCurrentStockLevels = async () => {
  const [rows] = await pool.query(
    `SELECT
      f.fruit_id,
      f.fruit_name,
      s.packaging_size,
      s.selling_price,
      s.available_quantity
     FROM stock s
     JOIN fruits f ON s.fruit_id = f.fruit_id
     ORDER BY f.fruit_name ASC, FIELD(s.packaging_size, 'small', 'medium', 'large')`
  );
  return rows;
};

module.exports = {
  getTopSoldFruits,
  getRevenueByDateRange,
  getTopVendorByBoxes,
  getCurrentStockLevels,
};
