const { db } = require('../config/db');

async function withTransaction(callback) {
    const connection = await db.getConnection();

    try {
        await connection.query('BEGIN');

        const result = await callback(connection);

        await connection.query('COMMIT');

        return result;
    } catch (error) {
        try {
            await connection.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Transaction rollback failed:', rollbackError.message);
        }

        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    withTransaction
};
