const usersModel = require('../models/usersModel');
const { hashPassword } = require('../middleware/auth');
const { db } = require('../config/db');

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || '';
const role = process.env.ADMIN_ROLE || 'ADMIN';

async function main() {
    if (!password) {
        throw new Error('Set ADMIN_PASSWORD before running create-admin.');
    }

    if (!['ADMIN', 'MANAGER', 'CLERK'].includes(role)) {
        throw new Error('ADMIN_ROLE must be ADMIN, MANAGER or CLERK.');
    }

    const passwordHash = await hashPassword(password);
    const existing = await usersModel.findByUsername(username);

    if (existing) {
        await usersModel.updateCredentials(existing.user_id, { password_hash: passwordHash, role });
        console.log(`Updated existing user "${username}".`);
    } else {
        const userId = await usersModel.create({ username, password_hash: passwordHash, role });
        console.log(`Created user "${username}" with ID ${userId}.`);
    }

    await db.end();
}

main().catch(async error => {
    console.error('create-admin failed:', error.message);
    await db.end().catch(() => {});
    process.exitCode = 1;
});
