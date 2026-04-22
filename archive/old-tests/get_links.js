const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.czzbduzmwzoumgzfryou:WnL4TDs1sSTFAJs7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function getLinks() {
    try {
        await client.connect();
        const res = await client.query("SELECT project_code FROM public.projects WHERE status != 'deleted' ORDER BY created_at DESC");
        console.log('---PROJECT_CODES_START---');
        console.log(JSON.stringify(res.rows));
        console.log('---PROJECT_CODES_END---');
    } catch (err) {
        console.error('Error fetching links:', err);
    } finally {
        await client.end();
    }
}

getLinks();
