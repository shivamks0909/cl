const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.hhonnqntmfjheyeneain:4SeOvHNJdcyKY28n@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Add project_name column to responses
        await client.query(`
      ALTER TABLE responses ADD COLUMN IF NOT EXISTS project_name text;
    `);

        // Backfill project_name from projects table
        await client.query(`
      UPDATE responses r
      SET project_name = p.project_name
      FROM projects p
      WHERE r.project_id = p.id AND r.project_name IS NULL;
    `);

        console.log('Column "project_name" added and backfilled for "responses" table!');
    } catch (e) {
        console.error('Error optimizing responses table:', e);
    } finally {
        await client.end();
    }
}

run();
