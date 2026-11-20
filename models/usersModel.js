const { db } = require('../config/db');

async function findByUsername(username) {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
}

async function findById(id) {
    const [rows] = await db.query(
        'SELECT user_id, username, role, is_active, created_at FROM users WHERE user_id = ?',
        [id]
    );
    return rows[0] || null;
}

async function create(values) {
    const [result] = await db.query(
        `INSERT INTO users (username, password_hash, role, is_active)
         VALUES (?, ?, ?, 1)`,
        [values.username, values.password_hash, values.role || 'CLERK']
    );
    return result.insertId;
}

async function setActive(id, isActive) {
    await db.query('UPDATE users SET is_active = ? WHERE user_id = ?', [isActive ? 1 : 0, id]);
}

async function updateCredentials(id, values) {
    await db.query(
        `UPDATE users
         SET password_hash = ?, role = ?, is_active = 1
         WHERE user_id = ?`,
        [values.password_hash, values.role || 'CLERK', id]
    );
}

async function createToken(userId, tokenHash, expiresAt) {
    await db.query(
        `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
        [userId, tokenHash, expiresAt]
    );
}

async function findToken(tokenHash) {
    const [rows] = await db.query(
        `SELECT t.token_hash, t.expires_at, u.user_id, u.username, u.role, u.is_active
         FROM auth_tokens t
         INNER JOIN users u ON t.user_id = u.user_id
         WHERE t.token_hash = ?`,
        [tokenHash]
    );
    return rows[0] || null;
}

async function deleteToken(tokenHash) {
    const [result] = await db.query('DELETE FROM auth_tokens WHERE token_hash = ?', [tokenHash]);
    return result.affectedRows;
}

async function deleteExpiredTokens() {
    await db.query('DELETE FROM auth_tokens WHERE expires_at <= NOW()');
}

module.exports = {
    findByUsername,
    findById,
    create,
    setActive,
    updateCredentials,
    createToken,
    findToken,
    deleteToken,
    deleteExpiredTokens
};
