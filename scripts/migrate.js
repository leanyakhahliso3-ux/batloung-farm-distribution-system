const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');

async function migrate() {
    const directory = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(directory)
        .filter(file => file.endsWith('.js'))
        .sort();

    for (const file of files) {
        const migration = require(path.join(directory, file));
        console.log(`Migration: ${migration.name}`);

        for (const statement of migration.statements) {
            const [rows] = await db.query(statement.check);

            if (rows.length > 0 && !statement.force) {
                console.log(`  skip: ${statement.label}`);
                continue;
            }

            await db.query(statement.sql);
            console.log(`  applied: ${statement.label}`);
        }
    }
}

async function main() {
    try {
        await migrate();
        await db.end();
        console.log('Migrations completed.');
    } catch (error) {
        console.error('Migration failed:', error.message);
        await db.end().catch(() => {});
        process.exitCode = 1;
    }
}

main();
