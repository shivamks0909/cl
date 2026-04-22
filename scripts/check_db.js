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
    const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    console.log('Existing tables:', res.rows.map(r => r.table_name));
    
    for (let table of res.rows.map(r => r.table_name)) {
        const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${table}'
        `);
        console.log(`Table ${table} columns:`, cols.rows.map(c => c.column_name).join(', '));
    }
    
    await client.end();
}
check();
