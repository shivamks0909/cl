const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.hhonnqntmfjheyeneain:4SeOvHNJdcyKY28n@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
        console.log('Tables:', tableRes.rows.map(r => r.table_name));

        const responseCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'responses';
    `);
        console.log('Responses Columns:', responseCols.rows);

        const projectRes = await client.query(`SELECT count(*) FROM projects;`);
        console.log('Project Count:', projectRes.rows[0].count);

        const matchCheck = await client.query(`SELECT project_code FROM projects LIMIT 5;`);
        console.log('Existing Project Codes:', matchCheck.rows.map(r => r.project_code));

        const lastResponses = await client.query(`SELECT * FROM responses ORDER BY created_at DESC LIMIT 5;`);
        console.log('Last 5 Responses:', lastResponses.rows);

    } catch (e) {
        console.error('Inspect Error:', e);
    } finally {
        await client.end();
    }
}

run();
