const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function check() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const tables = ['clients', 'projects', 'suppliers', 'responses', 'users'];
    for (let table of tables) {
        try {
            const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`Table ${table} has ${res.rows[0].count} rows.`);
        } catch (e) {
            console.log(`Table ${table} check failed: ${e.message}`);
        }
    }
    await client.end();
}
check();
