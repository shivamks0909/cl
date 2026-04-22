const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.hhonnqntmfjheyeneain:4SeOvHNJdcyKY28n@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const projRes = await client.query("SELECT id FROM projects WHERE project_code = 'WEQWEW' LIMIT 1;");
        if (projRes.rows.length === 0) {
            console.log('Project WEQWEW not found');
            return;
        }
        const realProjectId = projRes.rows[0].id;

        const res = await client.query(`
      INSERT INTO responses (project_id, project_code, uid, clickid, status)
      VALUES (
        $1, 
        'WEQWEW', 
        'test-uid-v3', 
        'custom-string-uid-success', 
        'in_progress'
      )
    `, [realProjectId]);
        console.log('Insert success? Row count:', res.rowCount);
    } catch (e) {
        console.error('Insert Failed:', e.message);
    } finally {
        await client.end();
    }
}

run();
