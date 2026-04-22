const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.czzbduzmwzoumgzfryou:WnL4TDs1sSTFAJs7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

const newHash = '$2b$10$yQf37KMnY3BD3Z6PUhLhvOf0Y.ZwNd5XAEBbwP58YdHaFnC871Opm';
const email = 'admin@opinioninsights.com';

async function resetPassword() {
    try {
        await client.connect();
        const res = await client.query('UPDATE public.admins SET password_hash = $1 WHERE email = $2', [newHash, email]);
        console.log('Update result:', res.rowCount, 'rows updated.');

        const check = await client.query('SELECT email, password_hash FROM public.admins WHERE email = $1', [email]);
        console.log('Current data in DB:', JSON.stringify(check.rows));
    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        await client.end();
    }
}

resetPassword();
