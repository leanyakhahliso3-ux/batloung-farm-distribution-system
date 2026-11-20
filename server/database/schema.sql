CREATE DATABASE IF NOT EXISTS batloung_distribution_db;
USE batloung_distribution_db;

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(25) NOT NULL UNIQUE,
    province ENUM(
        'Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape',
        'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'
    ) NOT NULL,
    address VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS fruits (
    fruit_id INT AUTO_INCREMENT PRIMARY KEY,
    fruit_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('AVAILABLE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(25) NOT NULL UNIQUE,
    location VARCHAR(150) NOT NULL,
    registration_date DATE NOT NULL DEFAULT (CURRENT_DATE)
);

CREATE TABLE IF NOT EXISTS stock (
    stock_id INT AUTO_INCREMENT PRIMARY KEY,
    fruit_id INT NOT NULL,
    packaging_size ENUM('small', 'medium', 'large') NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0),
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    UNIQUE KEY unique_fruit_size (fruit_id, packaging_size),
    CONSTRAINT fk_stock_fruit FOREIGN KEY (fruit_id)
        REFERENCES fruits(fruit_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id)
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_details (
    purchase_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    fruit_id INT NOT NULL,
    packaging_size ENUM('small', 'medium', 'large') NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    CONSTRAINT fk_pd_purchase FOREIGN KEY (purchase_id)
        REFERENCES purchases(purchase_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pd_fruit FOREIGN KEY (fruit_id)
        REFERENCES fruits(fruit_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL DEFAULT 'CASH',
    payment_status ENUM('PAID', 'PARTIALLY_PAID', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    CONSTRAINT fk_sales_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendors(vendor_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_details (
    sales_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    fruit_id INT NOT NULL,
    packaging_size ENUM('small', 'medium', 'large') NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    CONSTRAINT fk_sd_sale FOREIGN KEY (sale_id)
        REFERENCES sales(sale_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sd_fruit FOREIGN KEY (fruit_id)
        REFERENCES fruits(fruit_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sale_payment_entries (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    entry_type ENUM('LEGACY', 'PAYMENT', 'ADJUSTMENT') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL,
    entry_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sale_payment_entries_sale_id (sale_id),
    CONSTRAINT chk_sale_payment_entries_amount CHECK (
        (entry_type = 'ADJUSTMENT' AND amount < 0)
        OR (entry_type <> 'ADJUSTMENT' AND amount > 0)
    ),
    CONSTRAINT fk_sale_payment_entries_sale FOREIGN KEY (sale_id)
        REFERENCES sales(sale_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
