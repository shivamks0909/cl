const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.hhonnqntmfjheyeneain:4SeOvHNJdcyKY28n@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function applyMigration() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL');

        const sql = fs.readFileSync(path.join(__dirname, 'fix_analytics.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration applied successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
