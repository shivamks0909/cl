const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function createTestAdmin() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const email = process.env.TEST_ADMIN_EMAIL || 'testadmin@opinioninsights.in';
        const password = process.env.TEST_ADMIN_PASSWORD;

        if (!password) {
            console.error('ERROR: TEST_ADMIN_PASSWORD environment variable is required');
            process.exit(1);
        }

        const hash = await bcrypt.hash(password, 12);
        
        await client.query(
            'INSERT INTO users (id, email, password, name, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET password = $3', 
            ['adadbada-0000-4000-b000-000000000002', email, hash, 'Test Admin', 'admin']
        );
        
        console.log(`CREATED/UPDATED: ${email}`);

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await client.end();
    }
}

createTestAdmin();
