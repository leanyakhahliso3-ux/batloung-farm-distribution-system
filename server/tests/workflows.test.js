const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, pool } = require('./testDatabase');
const { createPurchaseTransaction } = require('../models/purchaseModel');
const fruitStockModel = require('../models/fruitStockModel');
const saleModel = require('../models/saleModel');
const reportModel = require('../models/reportModel');

before(setup);
after(teardown);

const queryOne = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows[0];
};

const fruitIdByName = async (name) => {
  const row = await queryOne('SELECT fruit_id FROM fruits WHERE fruit_name = ?', [name]);
  assert.ok(row, `Fruit ${name} was not seeded`);
  return row.fruit_id;
};

const stockQuantity = async (fruitId, packagingSize) => {
  const row = await queryOne(
    'SELECT available_quantity FROM stock WHERE fruit_id = ? AND packaging_size = ?',
    [fruitId, packagingSize]
  );
  assert.ok(row, `Stock row for fruit ${fruitId} (${packagingSize}) was not found`);
  return Number(row.available_quantity);
};

const tableCount = async (table) => {
  const row = await queryOne(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(row.total);
};

let saleId;

test('fruit status schema uses AVAILABLE and UNAVAILABLE', async () => {
  const column = await queryOne(
    `SELECT COLUMN_TYPE, COLUMN_DEFAULT
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fruits' AND COLUMN_NAME = 'status'`
  );
  assert.equal(column.COLUMN_TYPE, "enum('AVAILABLE','UNAVAILABLE')");
  assert.equal(column.COLUMN_DEFAULT, 'AVAILABLE');

  const [statuses] = await pool.query('SELECT DISTINCT status FROM fruits');
  assert.deepEqual(statuses.map((row) => row.status), ['AVAILABLE']);
});

test('multi-item purchase increases stock and rolls back on an invalid item', async () => {
  const apples = await fruitIdByName('Apples');
  const oranges = await fruitIdByName('Oranges');
  const supplier = await queryOne('SELECT supplier_id FROM suppliers ORDER BY supplier_id LIMIT 1');

  const applesBefore = await stockQuantity(apples, 'small');
  const orangesBefore = await stockQuantity(oranges, 'medium');
  const purchasesBefore = await tableCount('purchases');

  const purchase = await createPurchaseTransaction({
    supplier_id: supplier.supplier_id,
    purchase_date: '2026-11-20',
    items: [
      { fruit_id: apples, packaging_size: 'small', quantity: 5, unit_cost: 70 },
      { fruit_id: oranges, packaging_size: 'medium', quantity: 3, unit_cost: 120 },
    ],
  });

  assert.equal(Number(purchase.total_amount), 710);
  assert.equal(await tableCount('purchases'), purchasesBefore + 1);
  assert.equal(await tableCount('purchase_details'), 2);
  assert.equal(await stockQuantity(apples, 'small'), applesBefore + 5);
  assert.equal(await stockQuantity(oranges, 'medium'), orangesBefore + 3);

  const purchasesBeforeFailure = await tableCount('purchases');
  const detailsBeforeFailure = await tableCount('purchase_details');
  const applesAtFailure = await stockQuantity(apples, 'small');

  await assert.rejects(
    createPurchaseTransaction({
      supplier_id: supplier.supplier_id,
      purchase_date: '2026-11-20',
      items: [
        { fruit_id: apples, packaging_size: 'small', quantity: 2, unit_cost: 70 },
        { fruit_id: 999999, packaging_size: 'small', quantity: 2, unit_cost: 70 },
      ],
    }),
    /Fruit ID 999999 does not exist/
  );

  assert.equal(await tableCount('purchases'), purchasesBeforeFailure);
  assert.equal(await tableCount('purchase_details'), detailsBeforeFailure);
  assert.equal(await stockQuantity(apples, 'small'), applesAtFailure);
});

test('multi-item sale decreases stock and payment management updates status', async () => {
  const apples = await fruitIdByName('Apples');
  const oranges = await fruitIdByName('Oranges');
  const vendor = await queryOne('SELECT vendor_id FROM vendors ORDER BY vendor_id LIMIT 1');

  const applesBefore = await stockQuantity(apples, 'small');
  const orangesBefore = await stockQuantity(oranges, 'medium');

  const sale = await saleModel.createSaleTransaction({
    vendor_id: vendor.vendor_id,
    payment_method: 'MOBILE_MONEY',
    amount_paid: 100,
    sale_date: '2026-11-20',
    items: [
      { fruit_id: apples, packaging_size: 'small', quantity: 4 },
      { fruit_id: oranges, packaging_size: 'medium', quantity: 2 },
    ],
  });

  saleId = sale.sale_id;
  assert.equal(Number(sale.total_amount), 600);
  assert.equal(sale.payment_status, 'PARTIALLY_PAID');
  assert.equal(Number(sale.balance_due), 500);
  assert.equal(await stockQuantity(apples, 'small'), applesBefore - 4);
  assert.equal(await stockQuantity(oranges, 'medium'), orangesBefore - 2);
  assert.equal(await tableCount('sales_details'), 2);

  const paid = await saleModel.updateSalePayment(saleId, { payment_method: 'CASH', amount_paid: 600 });
  assert.equal(paid.payment_status, 'PAID');
  assert.equal(Number(paid.balance_due), 0);
  assert.equal(paid.payment_method, 'CASH');

  const unpaid = await saleModel.updateSalePayment(saleId, { payment_method: 'CREDIT', amount_paid: 0 });
  assert.equal(unpaid.payment_status, 'UNPAID');
  assert.equal(Number(unpaid.balance_due), 600);

  await assert.rejects(
    saleModel.updateSalePayment(saleId, { amount_paid: 601 }),
    /Invalid payment amount/
  );

  const restored = await saleModel.updateSalePayment(saleId, { payment_method: 'CASH', amount_paid: 600 });
  assert.equal(restored.payment_status, 'PAID');
});

test('insufficient stock rejects the sale and rolls back every change', async () => {
  const apples = await fruitIdByName('Apples');
  const vendor = await queryOne('SELECT vendor_id FROM vendors ORDER BY vendor_id LIMIT 1');

  const salesBefore = await tableCount('sales');
  const detailsBefore = await tableCount('sales_details');
  const smallBefore = await stockQuantity(apples, 'small');
  const largeBefore = await stockQuantity(apples, 'large');

  await assert.rejects(
    saleModel.createSaleTransaction({
      vendor_id: vendor.vendor_id,
      payment_method: 'CASH',
      amount_paid: 0,
      sale_date: '2026-11-20',
      items: [
        { fruit_id: apples, packaging_size: 'small', quantity: 1 },
        { fruit_id: apples, packaging_size: 'large', quantity: 999 },
      ],
    }),
    /Insufficient stock/
  );

  assert.equal(await tableCount('sales'), salesBefore);
  assert.equal(await tableCount('sales_details'), detailsBefore);
  assert.equal(await stockQuantity(apples, 'small'), smallBefore);
  assert.equal(await stockQuantity(apples, 'large'), largeBefore);
});

test('all four reports return data from the tested workflow', async () => {
  const revenue = await reportModel.getRevenueByDateRange('2026-01-01', '2026-12-31');
  assert.equal(Number(revenue.total_revenue), 600);
  assert.equal(Number(revenue.total_sales), 1);

  const topFruits = await reportModel.getTopSoldFruits();
  const applesReport = topFruits.find((row) => row.fruit_name === 'Apples');
  const orangesReport = topFruits.find((row) => row.fruit_name === 'Oranges');
  assert.equal(Number(applesReport.total_boxes_sold), 4);
  assert.equal(Number(orangesReport.total_boxes_sold), 2);

  const topVendor = await reportModel.getTopVendorByBoxes();
  assert.equal(Number(topVendor.total_boxes), 6);

  const stockLevels = await reportModel.getCurrentStockLevels();
  const applesSmall = stockLevels.find((row) => row.fruit_name === 'Apples' && row.packaging_size === 'small');
  assert.ok(stockLevels.length >= 12);
  assert.equal(Number(applesSmall.available_quantity), 26);
  assert.equal(Number(applesSmall.selling_price), 80);
});

test('instalment payments are recorded individually and keep history', async () => {
  const partial = await saleModel.updateSalePayment(saleId, { payment_method: 'CREDIT', amount_paid: 500 });
  assert.equal(partial.payment_status, 'PARTIALLY_PAID');
  assert.equal(Number(partial.amount_paid), 500);

  const paid = await saleModel.addSalePayment(saleId, { payment_method: 'CASH', amount: 100 });
  assert.equal(paid.payment_status, 'PAID');
  assert.equal(Number(paid.amount_paid), 600);

  await assert.rejects(
    saleModel.addSalePayment(saleId, { amount: 1 }),
    /outstanding balance/
  );

  const history = await saleModel.getPaymentHistory(saleId);
  assert.equal(history.length, 6);
  assert.ok(history.some((entry) => entry.entry_type === 'PAYMENT' && Number(entry.amount) === 100));
  assert.ok(history.some((entry) => entry.entry_type === 'ADJUSTMENT' && Number(entry.amount) === -600));
  assert.ok(history.some((entry) => entry.entry_type === 'PAYMENT' && Number(entry.amount) === 100));
});

test('created sale used by payment tests still exists', async () => {
  const sale = await queryOne('SELECT sale_id, payment_status FROM sales WHERE sale_id = ?', [saleId]);
  assert.ok(sale);
  assert.equal(sale.payment_status, 'PAID');
});

test('stock details update changes price and quantity together', async () => {
  const apples = await fruitIdByName('Apples');
  const stock = await queryOne(
    'SELECT stock_id, selling_price, available_quantity FROM stock WHERE fruit_id = ? AND packaging_size = ?',
    [apples, 'large']
  );
  const salesBefore = await tableCount('sales');
  const expectedQuantity = Number(stock.available_quantity) + 2;

  const updated = await fruitStockModel.updateStockDetails(stock.stock_id, {
    sellingPrice: 275,
    quantity: expectedQuantity,
  });

  assert.equal(Number(updated.selling_price), 275);
  assert.equal(Number(updated.available_quantity), expectedQuantity);

  const persisted = await queryOne('SELECT selling_price, available_quantity FROM stock WHERE stock_id = ?', [stock.stock_id]);
  assert.equal(Number(persisted.selling_price), 275);
  assert.equal(Number(persisted.available_quantity), expectedQuantity);
  assert.equal(await tableCount('sales'), salesBefore);
});
