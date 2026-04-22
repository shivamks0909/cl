const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.czzbduzmwzoumgzfryou:WnL4TDs1sSTFAJs7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function fixDb() {
    try {
        await client.connect();
        console.log('Connected to DB.');

        // 1. Fix status_check constraint
        console.log('Updating status_check constraint...');
        await client.query('ALTER TABLE projects DROP CONSTRAINT IF EXISTS status_check');
        await client.query("ALTER TABLE projects ADD CONSTRAINT status_check CHECK (status IN ('active', 'paused', 'deleted'))");
        console.log('Constraint updated successfully.');

        // 2. Sample check for a project to see UID parameter values
        const res = await client.query('SELECT project_code, client_uid_param, base_url FROM projects ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent Projects Data:');
        console.table(res.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixDb();
