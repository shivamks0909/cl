const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function getLatest() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query(
            "SELECT id, project_code, uid, status, oi_session, clickid, created_at FROM responses ORDER BY created_at DESC LIMIT 10"
        );
        console.log("--- Latest Responses ---");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

getLatest();
