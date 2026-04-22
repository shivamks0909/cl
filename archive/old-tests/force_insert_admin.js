const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.czzbduzmwzoumgzfryou:WnL4TDs1sSTFAJs7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

const h = '$2b$10$yQf37KMnY3BD3Z6PUhLhvOf0Y.ZwNd5XAEBbwP58YdHaFnC871Opm';
const email = 'admin@opinioninsights.com';

async function forceInsert() {
    try {
        await client.connect();
        console.log('Connected to DB.');
        const res = await client.query(
            'INSERT INTO public.admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = $2',
            [email, h]
        );
        console.log('Insert/Update result:', res.rowCount, 'rows.');

        const verification = await client.query('SELECT email FROM public.admins WHERE email = $1', [email]);
        console.log('Verification check:', verification.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
    } catch (err) {
        console.error('Error during insert:', err);
    } finally {
        await client.end();
    }
}

forceInsert();
