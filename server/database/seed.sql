USE batloung_distribution_db;

INSERT IGNORE INTO suppliers (business_name, contact_person, phone, province, address) VALUES
('Highveld Fresh Orchards', 'Thabo Mokoena', '+27821112233', 'Free State', '14 Bethlehem Rd, Ficksburg'),
('Limpopo Citrus & Mangoes', 'Naledi Molefe', '+27834445566', 'Limpopo', '88 Tzaneen Valley, Tzaneen'),
('Cape Winelands Grapes', 'Pieter van der Merwe', '+27847778899', 'Western Cape', '22 Paarl Main St, Paarl'),
('Mpumalanga Tropicals', 'Sipho Nkosi', '+27729990011', 'Mpumalanga', '5 Nelspruit Industrial, Mbombela'),
('Gauteng Market Gardens', 'Lerato Dlamini', '+27861110022', 'Gauteng', '9 Lyndhurst Rd, Johannesburg'),
('KZN Valley Produce', 'Musa Ntuli', '+27813334455', 'KwaZulu-Natal', '41 Old Greytown Rd, Pietermaritzburg'),
('Eastern Cape Orchard Co-op', 'Anita Jansen', '+27845556677', 'Eastern Cape', '12 Langenhoven St, Umtata'),
('North West Fresh Fields', 'Kagiso Setlhodi', '+27827778899', 'North West', '7 Rustenburg Industrial, Rustenburg'),
('Northern Cape Vineyards', 'Hendrik van Wyk', '+27853339988', 'Northern Cape', '18 Douglas Rd, Kimberley');

INSERT IGNORE INTO fruits (fruit_name, description, status) VALUES
('Apples', 'Crisp red and green Golden Delicious apples', 'AVAILABLE'),
('Oranges', 'Sweet Valencia navels', 'AVAILABLE'),
('Mangoes', 'Kent and Tommy Atkins mangoes', 'AVAILABLE'),
('Grapes', 'Seedless crimson red grapes', 'AVAILABLE');

INSERT IGNORE INTO stock (fruit_id, packaging_size, selling_price, available_quantity)
SELECT f.fruit_id, p.packaging_size, p.selling_price, p.available_quantity
FROM fruits f
JOIN (
  SELECT 'Apples' AS fruit_name, 'small' AS packaging_size, 80.00 AS selling_price, 25 AS available_quantity
  UNION ALL SELECT 'Apples', 'medium', 150.00, 15
  UNION ALL SELECT 'Apples', 'large', 260.00, 6
  UNION ALL SELECT 'Oranges', 'small', 75.00, 18
  UNION ALL SELECT 'Oranges', 'medium', 140.00, 10
  UNION ALL SELECT 'Oranges', 'large', 240.00, 4
  UNION ALL SELECT 'Mangoes', 'small', 95.00, 14
  UNION ALL SELECT 'Mangoes', 'medium', 175.00, 8
  UNION ALL SELECT 'Mangoes', 'large', 300.00, 3
  UNION ALL SELECT 'Grapes', 'small', 110.00, 20
  UNION ALL SELECT 'Grapes', 'medium', 200.00, 11
  UNION ALL SELECT 'Grapes', 'large', 340.00, 5
) p ON p.fruit_name = f.fruit_name;

INSERT IGNORE INTO vendors (vendor_name, phone_number, location) VALUES
('Mamello Fresh Stall', '+26658123456', 'Maseru Central Market'),
('Paseka Corner Mini-Mart', '+26662987654', 'Pioneer Mall Rank, Maseru'),
('Lineo Street Produce', '+26659456123', 'Ha Thetsane, Maseru'),
('Tshepo Fruit & Veg', '+26663789456', 'Kingsway, Maseru');
