const { Client } = require('pg');

const connectionString = 'postgresql://postgres:WnL4TDs1sSTFAJs7@db.qvgrzxuonxhwnxitnfvk.supabase.co:6543/postgres?sslmode=require';

async function test() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Successfully connected to Postgres on Supabase!');
    const res = await client.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');
    console.log('Tables:', res.rows.map(r => r.tablename));
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

test();
