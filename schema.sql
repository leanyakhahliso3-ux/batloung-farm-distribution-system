CREATE DATABASE IF NOT EXISTS batloung_farm
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE batloung_farm;

CREATE TABLE IF NOT EXISTS users (
    user_id    INT          NOT NULL AUTO_INCREMENT,
    username   VARCHAR(50)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role       ENUM('ADMIN', 'MANAGER', 'CLERK') NOT NULL DEFAULT 'CLERK',
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_username (username)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_tokens (
    token_id   INT          NOT NULL AUTO_INCREMENT,
    user_id    INT          NOT NULL,
    token_hash CHAR(64)     NOT NULL,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_id),
    UNIQUE KEY uq_auth_tokens_hash (token_hash),
    KEY idx_auth_tokens_user (user_id),
    KEY idx_auth_tokens_expiry (expires_at),
    CONSTRAINT fk_auth_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id    INT          NOT NULL AUTO_INCREMENT,
    business_name  VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone          VARCHAR(15)  NOT NULL,
    province       ENUM('Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape',
                        'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West',
                        'Northern Cape') NOT NULL,
    address        VARCHAR(255) NOT NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (supplier_id),
    UNIQUE KEY uq_suppliers_phone (phone),
    KEY idx_suppliers_province (province)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fruits (
    fruit_id    INT          NOT NULL AUTO_INCREMENT,
    fruit_name  VARCHAR(50)  NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    status      ENUM('Available', 'Unavailable') NOT NULL DEFAULT 'Available',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (fruit_id),
    UNIQUE KEY uq_fruits_name (fruit_name)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id         INT          NOT NULL AUTO_INCREMENT,
    vendor_name       VARCHAR(100) NOT NULL,
    phone_number      VARCHAR(15)  NOT NULL,
    location          VARCHAR(100) NOT NULL,
    registration_date DATE         NOT NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (vendor_id),
    UNIQUE KEY uq_vendors_phone (phone_number),
    KEY idx_vendors_location (location)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchases (
    purchase_id    INT           NOT NULL AUTO_INCREMENT,
    supplier_id    INT           NOT NULL,
    purchase_date  DATE          NOT NULL,
    total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL DEFAULT 'CREDIT',
    payment_status ENUM('PAID', 'PARTIALLY_PAID', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
    amount_paid    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (purchase_id),
    KEY idx_purchases_supplier (supplier_id),
    KEY idx_purchases_date (purchase_date),
    CONSTRAINT fk_purchases_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_purchases_amount_paid
        CHECK (amount_paid >= 0 AND amount_paid <= total_amount),
    CONSTRAINT chk_purchases_total CHECK (total_amount >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_details (
    purchase_detail_id INT           NOT NULL AUTO_INCREMENT,
    purchase_id        INT           NOT NULL,
    fruit_id           INT           NOT NULL,
    quantity           INT           NOT NULL,
    unit_cost          DECIMAL(10,2) NOT NULL,
    packaging_size     ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
    created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (purchase_detail_id),
    KEY idx_purchase_details_purchase (purchase_id),
    KEY idx_purchase_details_fruit (fruit_id),
    CONSTRAINT fk_purchase_details_fruit
        FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_details_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases (purchase_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_purchase_details_quantity CHECK (quantity > 0),
    CONSTRAINT chk_purchase_details_unit_cost CHECK (unit_cost >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales (
    sale_id        INT           NOT NULL AUTO_INCREMENT,
    vendor_id      INT           NOT NULL,
    sale_date      DATE          NOT NULL,
    payment_status ENUM('PAID', 'PARTIALLY_PAID', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
    total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL DEFAULT 'CREDIT',
    amount_paid    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sale_id),
    KEY idx_sales_vendor (vendor_id),
    KEY idx_sales_date (sale_date),
    CONSTRAINT fk_sales_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_sales_amount_paid
        CHECK (amount_paid >= 0 AND amount_paid <= total_amount),
    CONSTRAINT chk_sales_total CHECK (total_amount >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_details (
    sales_detail_id INT           NOT NULL AUTO_INCREMENT,
    sale_id         INT           NOT NULL,
    fruit_id        INT           NOT NULL,
    packaging_size  ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
    quantity        INT           NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sales_detail_id),
    KEY idx_sales_details_sale (sale_id),
    KEY idx_sales_details_fruit (fruit_id),
    CONSTRAINT fk_sales_details_sale
        FOREIGN KEY (sale_id) REFERENCES sales (sale_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sales_details_fruit
        FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_sales_details_quantity CHECK (quantity > 0),
    CONSTRAINT chk_sales_details_unit_price CHECK (unit_price >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock (
    stock_id           INT          NOT NULL AUTO_INCREMENT,
    fruit_id           INT          NOT NULL,
    packaging_size     ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
    available_quantity INT          NOT NULL DEFAULT 0,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (stock_id),
    UNIQUE KEY uq_stock_fruit_packaging (fruit_id, packaging_size),
    CONSTRAINT fk_stock_fruit
        FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_stock_quantity CHECK (available_quantity >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    payment_id       INT           NOT NULL AUTO_INCREMENT,
    purchase_id      INT           NULL,
    sale_id          INT           NULL,
    amount           DECIMAL(10,2) NOT NULL,
    payment_method   ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL,
    payment_reference VARCHAR(100) NOT NULL,
    paid_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by      INT           NULL,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    UNIQUE KEY uq_payments_reference (payment_reference),
    KEY idx_payments_purchase (purchase_id),
    KEY idx_payments_sale (sale_id),
    KEY idx_payments_paid_at (paid_at),
    CONSTRAINT fk_payments_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases (purchase_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payments_sale
        FOREIGN KEY (sale_id) REFERENCES sales (sale_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payments_recorded_by
        FOREIGN KEY (recorded_by) REFERENCES users (user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_payments_one_transaction
        CHECK ((purchase_id IS NOT NULL) <> (sale_id IS NOT NULL)),
    CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id     INT          NOT NULL AUTO_INCREMENT,
    stock_id        INT          NULL,
    fruit_id        INT          NOT NULL,
    packaging_size  ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
    quantity_change INT          NOT NULL,
    balance_after   INT          NOT NULL,
    movement_type   ENUM('PURCHASE', 'PURCHASE_UPDATE', 'PURCHASE_DELETE',
                         'SALE', 'SALE_UPDATE', 'SALE_DELETE',
                         'MANUAL_ADJUSTMENT') NOT NULL,
    reference_id    INT          NULL,
    recorded_by     INT          NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (movement_id),
    KEY idx_stock_movements_fruit (fruit_id),
    KEY idx_stock_movements_created (created_at),
    KEY idx_stock_movements_reference (movement_type, reference_id),
    CONSTRAINT fk_stock_movements_fruit
        FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_movements_recorded_by
        FOREIGN KEY (recorded_by) REFERENCES users (user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_stock_movements_change CHECK (quantity_change <> 0),
    CONSTRAINT chk_stock_movements_balance CHECK (balance_after >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
