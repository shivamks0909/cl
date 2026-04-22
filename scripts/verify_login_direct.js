const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function test() {
    console.log('--- DB Connection Test ---');
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Postgres.');

        const email = process.env.TEST_ADMIN_EMAIL || 'admin@opinioninsights.in';
        const password = process.env.TEST_ADMIN_PASSWORD;

        if (!password) {
            console.error('ERROR: TEST_ADMIN_PASSWORD environment variable is required');
            process.exit(1);
        }

        console.log(`Checking user: ${email}`);

        const res = await client.query('SELECT password FROM users WHERE email = $1', [email]);

        if (res.rows.length === 0) {
            console.error('ERROR: Admin user not found in DATABASE!');
            process.exit(1);
        }

        const storedHash = res.rows[0].password;
        console.log('Stored hash found. Verifying bcrypt password...');

        const match = await bcrypt.compare(password, storedHash);
        
        if (match) {
            console.log('SUCCESS: Credentials are CORRECT in the database.');
        } else {
            console.error('ERROR: Password does NOT match the stored hash!');
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
    } finally {
        await client.end();
    }
}

test();
