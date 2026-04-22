const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function inspect() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // 1. Get function arguments
    const resArgs = await client.query(`
        SELECT pg_get_function_arguments(p.oid) 
        FROM pg_proc p 
        JOIN pg_namespace n ON n.oid = p.pronamespace 
        WHERE p.proname = 'increment_quota'
    `);
    console.log('Arguments:', resArgs.rows[0]?.pg_get_function_arguments);

    // 2. Get function body
    const resBody = await client.query(`
        SELECT routine_definition 
        FROM information_schema.routines 
        WHERE routine_name = 'increment_quota'
    `);
    console.log('Body:', resBody.rows[0]?.routine_definition);

    await client.end();
  } catch (err) {
    console.error(err.message);
  }
}

inspect();
