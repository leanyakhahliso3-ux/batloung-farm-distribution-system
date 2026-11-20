-- seed.sql for Batloung Farm Distribution System (batloung_farm)
-- Read-only audit-derived seed based on current database records (core business data).
-- Does NOT include users/auth_tokens/passwords, payments, or stock_movements records.
--
-- Compatibility notes:
-- - Targets core tables: suppliers, fruits, vendors, purchases, purchase_details, sales, sales_details, stock.
-- - INSERT column lists omit created_at/updated_at so defaults apply if those columns exist (schema.sql/full migration).
-- - Compatible with post-migration core schema (created_at/updated_at present; sales.amount_paid/payment_method NOT NULL).
-- - Safe to run on an empty database that has the required schema and foreign keys.
-- - Uses ON DUPLICATE KEY UPDATE on primary/unique keys to avoid duplicate-key failures on rerun;
--   rerunning will overwrite matching seeded rows (by id/unique key) with these values and will not remove extra rows.
-- - Drafted from current DB records; not validated against official assignment-required sample data.
-- - Review before execution. Execute only with explicit approval.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- Suppliers
INSERT INTO suppliers (supplier_id, business_name, contact_person, phone, province, address) VALUES
(1, 'Green Valley Produce', 'Thabo Mokoena', '0114567890', 'Gauteng', '12 Main Reef Road, Johannesburg'),
(2, 'Free State Fresh Farms', 'Anna van Wyk', '0512233445', 'Free State', '45 Bloemfontein Road, Bloemfontein'),
(3, 'KZN Tropical Growers', 'Sipho Ndlovu', '0315567788', 'KwaZulu-Natal', '8 Umgeni Road, Durban'),
(4, 'Cape Orchard Suppliers', 'Pieter de Villiers', '0214478899', 'Western Cape', '22 Stellenbosch Avenue, Cape Town'),
(5, 'Eastern Cape Fruit Co-op', 'Nomsa Mthembu', '0413345566', 'Eastern Cape', '15 Govan Mbeki Avenue, Gqeberha'),
(6, 'Limpopo Harvest Traders', 'Johannes Sithole', '0156678899', 'Limpopo', '30 Landdros Mare Street, Polokwane'),
(7, 'Mpumalanga Green Fields', 'Lerato Mabaso', '0137789900', 'Mpumalanga', '5 Samora Machel Drive, Mbombela')
ON DUPLICATE KEY UPDATE
  business_name = VALUES(business_name),
  contact_person = VALUES(contact_person),
  phone = VALUES(phone),
  province = VALUES(province),
  address = VALUES(address);

-- Fruits
INSERT INTO fruits (fruit_id, fruit_name, description, status) VALUES
(1, 'Apples', 'Crisp red and green apples supplied in bulk', 'Available'),
(2, 'Bananas', 'Ripe yellow bananas sold by the bunch or box', 'Available'),
(3, 'Oranges', 'Juicy citrus oranges, ideal for fresh juice', 'Available'),
(4, 'Mangoes', 'Sweet seasonal mangoes from Limpopo and Mpumalanga', 'Available'),
(5, 'Grapes', 'Fresh table grapes supplied in punnets and boxes', 'Available')
ON DUPLICATE KEY UPDATE
  fruit_name = VALUES(fruit_name),
  description = VALUES(description),
  status = VALUES(status);

-- Vendors
INSERT INTO vendors (vendor_id, vendor_name, phone_number, location, registration_date) VALUES
(1, 'Thabo Fresh Market', '0723456789', 'Soweto, Gauteng', '2025-11-09'),
(2, 'Mama Zanele Fruit Stall', '0834567890', 'Umlazi, KwaZulu-Natal', '2025-12-01'),
(3, 'Cape Corner Grocers', '0215567890', 'Mitchells Plain, Western Cape', '2026-01-04'),
(4, 'Bloem Fresh Traders', '0516678901', 'Mangaung, Free State', '2026-01-14'),
(5, 'Polokwane Fruit Hub', '0157789012', 'Polokwane, Limpopo', '2026-01-31'),
(6, 'Mbombela Market Stall', '0138890123', 'Mbombela, Mpumalanga', '2026-02-17')
ON DUPLICATE KEY UPDATE
  vendor_name = VALUES(vendor_name),
  phone_number = VALUES(phone_number),
  location = VALUES(location),
  registration_date = VALUES(registration_date);

-- Purchases
INSERT INTO purchases (purchase_id, supplier_id, purchase_date, total_amount, payment_method, payment_status, amount_paid) VALUES
(1, 1, '2026-01-11', 4020.00, 'CREDIT', 'UNPAID', 0.00),
(2, 3, '2026-01-19', 1920.00, 'CASH', 'PARTIALLY_PAID', 1.25),
(3, 4, '2026-02-02', 5010.00, 'CREDIT', 'UNPAID', 0.00),
(4, 6, '2026-02-13', 2850.00, 'CREDIT', 'UNPAID', 0.00),
(5, 7, '2026-02-24', 2640.00, 'CREDIT', 'UNPAID', 0.00),
(6, 2, '2026-03-03', 2970.00, 'CREDIT', 'UNPAID', 0.00)
ON DUPLICATE KEY UPDATE
  supplier_id = VALUES(supplier_id),
  purchase_date = VALUES(purchase_date),
  total_amount = VALUES(total_amount),
  payment_method = VALUES(payment_method),
  payment_status = VALUES(payment_status),
  amount_paid = VALUES(amount_paid);

-- Purchase details
INSERT INTO purchase_details (purchase_detail_id, purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES
(1, 1, 1, 100, 15.00, 'MEDIUM'),
(2, 1, 2, 80, 22.50, 'LARGE'),
(3, 1, 3, 60, 12.00, 'MEDIUM'),
(4, 2, 2, 120, 8.50, 'SMALL'),
(5, 2, 4, 50, 18.00, 'MEDIUM'),
(6, 3, 5, 90, 25.00, 'SMALL'),
(7, 3, 1, 70, 28.00, 'LARGE'),
(8, 3, 3, 40, 20.00, 'LARGE'),
(9, 4, 4, 65, 30.00, 'LARGE'),
(10, 4, 2, 75, 12.00, 'MEDIUM'),
(11, 5, 3, 110, 6.50, 'SMALL'),
(12, 5, 5, 55, 35.00, 'LARGE'),
(13, 6, 1, 130, 9.00, 'SMALL'),
(14, 6, 5, 60, 30.00, 'MEDIUM')
ON DUPLICATE KEY UPDATE
  purchase_id = VALUES(purchase_id),
  fruit_id = VALUES(fruit_id),
  quantity = VALUES(quantity),
  unit_cost = VALUES(unit_cost),
  packaging_size = VALUES(packaging_size);

-- Sales
-- Note: adjusted for post-migration schema compatibility (sales.payment_method/amount_paid NOT NULL).
-- Legacy NULLs normalized to 'CREDIT' and 0.00 respectively, matching applied migration normalization;
-- sale 4 reflects normalized state (amount_paid 0.00, payment_method 'CREDIT', status PARTIALLY_PAID as recorded).
INSERT INTO sales (sale_id, vendor_id, sale_date, payment_status, total_amount, payment_method, amount_paid) VALUES
(1, 1, '2026-01-17', 'PAID', 1025.00, 'CREDIT', 1025.00),
(2, 2, '2026-01-24', 'UNPAID', 404.00, 'CREDIT', 0.00),
(3, 3, '2026-02-07', 'PAID', 1110.00, 'CREDIT', 1110.00),
(4, 4, '2026-02-19', 'PARTIALLY_PAID', 690.00, 'CREDIT', 0.00),
(5, 5, '2026-02-27', 'PAID', 850.00, 'CREDIT', 850.00),
(6, 6, '2026-03-05', 'UNPAID', 840.00, 'CREDIT', 0.00)
ON DUPLICATE KEY UPDATE
  vendor_id = VALUES(vendor_id),
  sale_date = VALUES(sale_date),
  payment_status = VALUES(payment_status),
  total_amount = VALUES(total_amount),
  payment_method = VALUES(payment_method),
  amount_paid = VALUES(amount_paid);

-- Sales details
INSERT INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES
(1, 1, 1, 'MEDIUM', 20, 25.00),
(2, 1, 2, 'LARGE', 15, 35.00),
(3, 2, 3, 'MEDIUM', 10, 18.00),
(4, 2, 4, 'MEDIUM', 8, 28.00),
(5, 3, 5, 'SMALL', 18, 35.00),
(6, 3, 1, 'LARGE', 12, 40.00),
(7, 4, 4, 'LARGE', 10, 45.00),
(8, 4, 2, 'MEDIUM', 12, 20.00),
(9, 5, 3, 'SMALL', 25, 12.00),
(10, 5, 5, 'LARGE', 10, 55.00),
(11, 6, 1, 'SMALL', 20, 15.00),
(12, 6, 5, 'MEDIUM', 12, 45.00)
ON DUPLICATE KEY UPDATE
  sale_id = VALUES(sale_id),
  fruit_id = VALUES(fruit_id),
  packaging_size = VALUES(packaging_size),
  quantity = VALUES(quantity),
  unit_price = VALUES(unit_price);

-- Stock
INSERT INTO stock (stock_id, fruit_id, packaging_size, available_quantity) VALUES
(1, 1, 'SMALL', 110),
(2, 1, 'MEDIUM', 80),
(3, 1, 'LARGE', 58),
(4, 2, 'SMALL', 120),
(5, 2, 'MEDIUM', 63),
(6, 2, 'LARGE', 65),
(7, 3, 'SMALL', 85),
(8, 3, 'MEDIUM', 50),
(9, 3, 'LARGE', 40),
(10, 4, 'SMALL', 30),
(11, 4, 'MEDIUM', 42),
(12, 4, 'LARGE', 55),
(13, 5, 'SMALL', 72),
(14, 5, 'MEDIUM', 48),
(15, 5, 'LARGE', 45)
ON DUPLICATE KEY UPDATE
  fruit_id = VALUES(fruit_id),
  packaging_size = VALUES(packaging_size),
  available_quantity = VALUES(available_quantity);

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

-- Optional: reset AUTO_INCREMENT counters after explicit-ID inserts (adjust if needed)
-- ALTER TABLE suppliers AUTO_INCREMENT = 8;
-- ALTER TABLE fruits AUTO_INCREMENT = 6;
-- ALTER TABLE vendors AUTO_INCREMENT = 7;
-- ALTER TABLE purchases AUTO_INCREMENT = 7;
-- ALTER TABLE purchase_details AUTO_INCREMENT = 15;
-- ALTER TABLE sales AUTO_INCREMENT = 7;
-- ALTER TABLE sales_details AUTO_INCREMENT = 13;
-- ALTER TABLE stock AUTO_INCREMENT = 16;
