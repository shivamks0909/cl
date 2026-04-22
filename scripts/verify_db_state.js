const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function verify() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase');

    const resP = await client.query('SELECT id, project_code FROM projects');
    console.log('Projects:', JSON.stringify(resP.rows));

    const resS = await client.query('SELECT id, supplier_token FROM suppliers');
    console.log('Suppliers:', JSON.stringify(resS.rows));

    const resL = await client.query('SELECT * FROM supplier_project_links');
    console.log('Links:', JSON.stringify(resL.rows));

    await client.end();
  } catch (e) {
    console.error(e.message);
  }
}

verify();
