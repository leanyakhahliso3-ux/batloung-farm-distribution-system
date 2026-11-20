INSERT IGNORE INTO purchases (purchase_id, supplier_id, purchase_date, total_amount)
SELECT 800001, supplier_id, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 1650.00 FROM suppliers WHERE business_name = 'Highveld Fresh Orchards';
INSERT IGNORE INTO purchases (purchase_id, supplier_id, purchase_date, total_amount)
SELECT 800002, supplier_id, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 2400.00 FROM suppliers WHERE business_name = 'Limpopo Citrus & Mangoes';
INSERT IGNORE INTO purchases (purchase_id, supplier_id, purchase_date, total_amount)
SELECT 800003, supplier_id, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 3000.00 FROM suppliers WHERE business_name = 'Cape Winelands Grapes';
INSERT IGNORE INTO purchases (purchase_id, supplier_id, purchase_date, total_amount)
SELECT 800005, supplier_id, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 2375.00 FROM suppliers WHERE business_name = 'Gauteng Market Gardens';
INSERT IGNORE INTO purchases (purchase_id, supplier_id, purchase_date, total_amount)
SELECT 800006, supplier_id, DATE_SUB(CURDATE(), INTERVAL 0 MONTH), 1900.00 FROM suppliers WHERE business_name = 'KZN Valley Produce';

INSERT IGNORE INTO purchase_details (purchase_detail_id, purchase_id, fruit_id, packaging_size, quantity, unit_cost)
SELECT 800001, p.purchase_id, f.fruit_id, 'small', 30, 55.00 FROM purchases p JOIN fruits f ON f.fruit_name = 'Apples' WHERE p.purchase_id = 800001;
INSERT IGNORE INTO purchase_details (purchase_detail_id, purchase_id, fruit_id, packaging_size, quantity, unit_cost)
SELECT 800002, p.purchase_id, f.fruit_id, 'medium', 20, 120.00 FROM purchases p JOIN fruits f ON f.fruit_name = 'Mangoes' WHERE p.purchase_id = 800002;
INSERT IGNORE INTO purchase_details (purchase_detail_id, purchase_id, fruit_id, packaging_size, quantity, unit_cost)
SELECT 800003, p.purchase_id, f.fruit_id, 'large', 12, 250.00 FROM purchases p JOIN fruits f ON f.fruit_name = 'Grapes' WHERE p.purchase_id = 800003;
INSERT IGNORE INTO purchase_details (purchase_detail_id, purchase_id, fruit_id, packaging_size, quantity, unit_cost)
SELECT 800005, p.purchase_id, f.fruit_id, 'medium', 25, 95.00 FROM purchases p JOIN fruits f ON f.fruit_name = 'Oranges' WHERE p.purchase_id = 800005;
INSERT IGNORE INTO purchase_details (purchase_detail_id, purchase_id, fruit_id, packaging_size, quantity, unit_cost)
SELECT 800006, p.purchase_id, f.fruit_id, 'large', 10, 190.00 FROM purchases p JOIN fruits f ON f.fruit_name = 'Apples' WHERE p.purchase_id = 800006;

INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900001, vendor_id, DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'CASH', 'PAID', 1600.00, 1600.00 FROM vendors WHERE vendor_name = 'Mamello Fresh Stall';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900003, vendor_id, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'CREDIT', 'PARTIALLY_PAID', 1920.00, 1000.00 FROM vendors WHERE vendor_name = 'Lineo Street Produce';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900004, vendor_id, DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'CASH', 'PAID', 1710.00, 1710.00 FROM vendors WHERE vendor_name = 'Tshepo Fruit & Veg';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900005, vendor_id, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'MOBILE_MONEY', 'PAID', 2400.00, 2400.00 FROM vendors WHERE vendor_name = 'Mamello Fresh Stall';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900006, vendor_id, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'CREDIT', 'UNPAID', 2340.00, 0.00 FROM vendors WHERE vendor_name = 'Paseka Corner Mini-Mart';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900008, vendor_id, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'MOBILE_MONEY', 'PAID', 1800.00, 1800.00 FROM vendors WHERE vendor_name = 'Tshepo Fruit & Veg';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900009, vendor_id, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'CREDIT', 'PARTIALLY_PAID', 2450.00, 1000.00 FROM vendors WHERE vendor_name = 'Mamello Fresh Stall';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900010, vendor_id, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'CASH', 'PAID', 2200.00, 2200.00 FROM vendors WHERE vendor_name = 'Paseka Corner Mini-Mart';
INSERT IGNORE INTO sales (sale_id, vendor_id, sale_date, payment_method, payment_status, total_amount, amount_paid)
SELECT 900011, vendor_id, DATE_SUB(CURDATE(), INTERVAL 0 MONTH), 'MOBILE_MONEY', 'PAID', 2400.00, 2400.00 FROM vendors WHERE vendor_name = 'Lineo Street Produce';

INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900001, s.sale_id, f.fruit_id, 'small', 20, 80.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Apples' WHERE s.sale_id = 900001;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900003, s.sale_id, f.fruit_id, 'large', 8, 240.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Oranges' WHERE s.sale_id = 900003;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900004, s.sale_id, f.fruit_id, 'small', 18, 95.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Mangoes' WHERE s.sale_id = 900004;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900005, s.sale_id, f.fruit_id, 'medium', 12, 200.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Grapes' WHERE s.sale_id = 900005;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900006, s.sale_id, f.fruit_id, 'large', 9, 260.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Apples' WHERE s.sale_id = 900006;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900008, s.sale_id, f.fruit_id, 'small', 24, 75.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Oranges' WHERE s.sale_id = 900008;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900009, s.sale_id, f.fruit_id, 'medium', 14, 175.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Mangoes' WHERE s.sale_id = 900009;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900010, s.sale_id, f.fruit_id, 'small', 20, 110.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Grapes' WHERE s.sale_id = 900010;
INSERT IGNORE INTO sales_details (sales_detail_id, sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT 900011, s.sale_id, f.fruit_id, 'medium', 16, 150.00 FROM sales s JOIN fruits f ON f.fruit_name = 'Apples' WHERE s.sale_id = 900011;

INSERT IGNORE INTO sale_payment_entries (entry_id, sale_id, entry_type, amount, payment_method, entry_date)
SELECT CASE sale_id
         WHEN 900001 THEN 950001
         WHEN 900003 THEN 950003
         WHEN 900004 THEN 950004
         WHEN 900005 THEN 950005
         WHEN 900008 THEN 950008
         WHEN 900009 THEN 950009
         WHEN 900010 THEN 950010
         WHEN 900011 THEN 950011
       END,
       sale_id,
       'LEGACY',
       amount_paid,
       payment_method,
       sale_date
FROM sales
WHERE sale_id BETWEEN 900001 AND 900012 AND amount_paid > 0;
