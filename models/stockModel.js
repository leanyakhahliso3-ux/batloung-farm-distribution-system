const { db } = require('../config/db');

const STOCK_SELECT = `
    SELECT s.stock_id, s.fruit_id, f.fruit_name,
           s.packaging_size, s.available_quantity
    FROM stock s
    INNER JOIN fruits f ON s.fruit_id = f.fruit_id
`;

class InsufficientStockError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientStockError';
    }
}

async function list() {
    const [rows] = await db.query(`${STOCK_SELECT} ORDER BY f.fruit_name ASC, s.packaging_size ASC`);
    return rows;
}

async function listByFruit(fruitId) {
    const [rows] = await db.query(`${STOCK_SELECT} WHERE s.fruit_id = ? ORDER BY s.packaging_size ASC`, [fruitId]);
    return rows;
}

async function listByPackagingSize(packagingSize) {
    const [rows] = await db.query(`${STOCK_SELECT} WHERE s.packaging_size = ? ORDER BY f.fruit_name ASC`, [packagingSize]);
    return rows;
}

async function listLowStock(threshold) {
    const [rows] = await db.query(`${STOCK_SELECT} WHERE s.available_quantity <= ? ORDER BY s.available_quantity ASC`, [threshold]);
    return rows;
}

async function findById(id) {
    const [rows] = await db.query('SELECT * FROM stock WHERE stock_id = ?', [id]);
    return rows[0] || null;
}

async function findByIdForUpdate(connection, id) {
    const [rows] = await connection.query('SELECT * FROM stock WHERE stock_id = ? FOR UPDATE', [id]);
    return rows[0] || null;
}

async function fruitExists(connection, fruitId) {
    const [rows] = await connection.query('SELECT fruit_id FROM fruits WHERE fruit_id = ?', [fruitId]);
    return rows.length > 0;
}

async function insert(connection, fruitId, packagingSize, quantity) {
    const [result] = await connection.query(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity)
         VALUES (?, ?, ?)`,
        [fruitId, packagingSize, quantity]
    );
    return result.insertId;
}

async function update(connection, stockId, fruitId, packagingSize, quantity) {
    await connection.query(
        `UPDATE stock
         SET fruit_id = ?, packaging_size = ?, available_quantity = ?
         WHERE stock_id = ?`,
        [fruitId, packagingSize, quantity, stockId]
    );
}

async function remove(connection, stockId) {
    const [result] = await connection.query('DELETE FROM stock WHERE stock_id = ?', [stockId]);
    return result.affectedRows;
}

async function recordMovement(connection, values) {
    await connection.query(
        `INSERT INTO stock_movements
         (stock_id, fruit_id, packaging_size, quantity_change, balance_after,
          movement_type, reference_id, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            values.stockId || null,
            values.fruitId,
            values.packagingSize,
            values.quantityChange,
            values.balanceAfter,
            values.movementType,
            values.referenceId || null,
            values.recordedBy || null
        ]
    );
}

async function increase(connection, fruitId, packagingSize, quantity, meta = {}) {
    await connection.query(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
             available_quantity = available_quantity + VALUES(available_quantity)`,
        [fruitId, packagingSize, quantity]
    );

    const [rows] = await connection.query(
        'SELECT stock_id, available_quantity FROM stock WHERE fruit_id = ? AND packaging_size = ?',
        [fruitId, packagingSize]
    );

    await recordMovement(connection, {
        stockId: rows[0].stock_id,
        fruitId,
        packagingSize,
        quantityChange: quantity,
        balanceAfter: Number(rows[0].available_quantity),
        movementType: meta.movementType || 'MANUAL_ADJUSTMENT',
        referenceId: meta.referenceId,
        recordedBy: meta.recordedBy
    });
}

async function decrease(connection, fruitId, packagingSize, quantity, label = 'this item', meta = {}) {
    const [rows] = await connection.query(
        `SELECT stock_id, available_quantity
         FROM stock
         WHERE fruit_id = ? AND packaging_size = ?
         FOR UPDATE`,
        [fruitId, packagingSize]
    );

    if (rows.length === 0) {
        throw new InsufficientStockError(`No stock record exists for ${label}.`);
    }

    const current = Number(rows[0].available_quantity);

    if (current < quantity) {
        throw new InsufficientStockError(
            `Insufficient stock for ${label}. Only ${current} available.`
        );
    }

    const balanceAfter = current - quantity;

    await connection.query(
        'UPDATE stock SET available_quantity = ? WHERE stock_id = ?',
        [balanceAfter, rows[0].stock_id]
    );

    await recordMovement(connection, {
        stockId: rows[0].stock_id,
        fruitId,
        packagingSize,
        quantityChange: -quantity,
        balanceAfter,
        movementType: meta.movementType || 'MANUAL_ADJUSTMENT',
        referenceId: meta.referenceId,
        recordedBy: meta.recordedBy
    });
}

function aggregate(lines) {
    const totals = new Map();

    for (const line of lines) {
        const key = `${Number(line.fruit_id)}|${line.packaging_size}`;
        totals.set(key, (totals.get(key) || 0) + Number(line.quantity));
    }

    return [...totals.entries()].map(([key, quantity]) => {
        const [fruitId, packagingSize] = key.split('|');
        return {
            fruit_id: Number(fruitId),
            packaging_size: packagingSize,
            quantity
        };
    });
}

function buildDelta(previousLines, nextLines, direction) {
    const totals = new Map();

    const apply = (lines, factor) => {
        for (const line of aggregate(lines)) {
            const key = `${line.fruit_id}|${line.packaging_size}`;
            totals.set(key, (totals.get(key) || 0) + line.quantity * factor);
        }
    };

    apply(previousLines, direction);
    apply(nextLines, direction * -1);

    return [...totals.entries()]
        .map(([key, delta]) => {
            const [fruitId, packagingSize] = key.split('|');
            return {
                fruit_id: Number(fruitId),
                packaging_size: packagingSize,
                delta
            };
        })
        .filter(change => change.delta !== 0);
}

async function applyDelta(connection, changes, meta = {}) {
    const ordered = [...changes].sort((a, b) =>
        a.fruit_id - b.fruit_id ||
        String(a.packaging_size).localeCompare(String(b.packaging_size))
    );

    for (const change of ordered) {
        if (change.delta > 0) {
            await increase(
                connection,
                change.fruit_id,
                change.packaging_size,
                change.delta,
                meta
            );
        } else {
            await decrease(
                connection,
                change.fruit_id,
                change.packaging_size,
                Math.abs(change.delta),
                `fruit ${change.fruit_id} (${change.packaging_size})`,
                meta
            );
        }
    }
}

module.exports = {
    InsufficientStockError,
    list,
    listByFruit,
    listByPackagingSize,
    listLowStock,
    findById,
    findByIdForUpdate,
    fruitExists,
    insert,
    update,
    remove,
    recordMovement,
    increase,
    decrease,
    aggregate,
    buildDelta,
    applyDelta
};
