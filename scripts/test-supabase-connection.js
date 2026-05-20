const { Client } = require('pg');

const password = 'WnL4TDs1sSTFAJs7';
const host = 'db.qvgrzxuonxhwnxitnfvk.supabase.co';
const connectionString = `postgresql://postgres:${password}@${host}:6543/postgres?sslmode=require`;

async function testConnection() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL at:', host);
    await client.connect();
    console.log('✅ Connection successful!');
    
    const res = await client.query('SELECT version()');
    console.log('Version:', res.rows[0].version);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
