const usersTable = `
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
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
`;

const authTokensTable = `
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
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
`;

const paymentsTable = `
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
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
`;

const stockMovementsTable = `
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
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
`;

const tableCheck = name => `
    SELECT 1
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${name}'
`;

const columnCheck = (table, column) => `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '${table}'
      AND COLUMN_NAME = '${column}'
`;

const indexCheck = (table, index) => `
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '${table}'
      AND INDEX_NAME = '${index}'
`;

const statements = [
    {
        label: 'create users table',
        check: tableCheck('users'),
        sql: usersTable
    },
    {
        label: 'create auth_tokens table',
        check: tableCheck('auth_tokens'),
        sql: authTokensTable
    },
    {
        label: 'create payments table',
        check: tableCheck('payments'),
        sql: paymentsTable
    },
    {
        label: 'create stock_movements table',
        check: tableCheck('stock_movements'),
        sql: stockMovementsTable
    }
];

for (const table of [
    'suppliers', 'fruits', 'vendors', 'purchases', 'purchase_details',
    'sales', 'sales_details', 'stock'
]) {
    statements.push({
        label: `${table}.created_at`,
        check: columnCheck(table, 'created_at'),
        sql: `ALTER TABLE ${table} ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
    });
    statements.push({
        label: `${table}.updated_at`,
        check: columnCheck(table, 'updated_at'),
        sql: `ALTER TABLE ${table} ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    });
}

statements.push({
    label: 'suppliers.province includes Northern Cape',
    check: `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'suppliers'
          AND COLUMN_NAME = 'province'
          AND COLUMN_TYPE LIKE '%Northern Cape%'
    `,
    sql: `
        ALTER TABLE suppliers
        MODIFY province ENUM('Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape',
                             'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West',
                             'Northern Cape') NOT NULL
    `
});

statements.push({
    label: 'normalise legacy sales payment values',
    check: 'SELECT 1 FROM sales WHERE amount_paid IS NULL OR payment_method IS NULL LIMIT 1',
    force: true,
    sql: `
        UPDATE sales
        SET amount_paid = COALESCE(amount_paid, 0),
            payment_method = COALESCE(payment_method, 'CREDIT')
        WHERE amount_paid IS NULL OR payment_method IS NULL
    `
});

statements.push({
    label: 'sales.amount_paid NOT NULL',
    check: `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sales'
          AND COLUMN_NAME = 'amount_paid'
          AND IS_NULLABLE = 'NO'
    `,
    sql: `ALTER TABLE sales MODIFY amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00`
});

statements.push({
    label: 'sales.payment_method NOT NULL',
    check: `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sales'
          AND COLUMN_NAME = 'payment_method'
          AND IS_NULLABLE = 'NO'
    `,
    sql: `ALTER TABLE sales MODIFY payment_method ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL DEFAULT 'CREDIT'`
});

statements.push({
    label: 'drop redundant stock fruit index',
    check: indexCheck('stock', 'idx_stock_fruit'),
    sql: 'ALTER TABLE stock DROP INDEX idx_stock_fruit'
});

module.exports = {
    name: '001_core_upgrade',
    statements
};
