const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function updatePassword() {
    console.log('--- Updating Admin Password ---');
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const password = process.env.ADMIN_PASSWORD;

        if (!password) {
            console.error('ERROR: ADMIN_PASSWORD environment variable is required');
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(password, salt);
        
        console.log(`New Hash for "${password}": ${hash}`);
        
        const res = await client.query(
            "UPDATE users SET password = $1 WHERE email = 'admin@opinioninsights.in'", 
            [hash]
        );
        
        if (res.rowCount > 0) {
            console.log('SUCCESS: Admin password updated and hashed correctly!');
        } else {
            console.error('ERROR: Admin user not found to update.');
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
    } finally {
        await client.end();
    }
}

updatePassword();
