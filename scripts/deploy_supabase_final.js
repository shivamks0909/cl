const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function deploy() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Supabase...');
        await client.connect();
        console.log('Connected!');

        console.log('Cleaning up public schema (dropping tables)...');
        const tablesToDrop = [
            'callback_logs', 'callback_events', 's2s_logs', 's2s_config', 
            'postback_logs', 'audit_logs', 'responses', 'supplier_project_links', 
            'projects', 'suppliers', 'clients', 'users', 'admins'
        ];
        
        for (let table of tablesToDrop) {
            try {
                await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`Dropped ${table}`);
            } catch (err) {
                console.warn(`Failed to drop ${table}:`, err.message);
            }
        }

        const schemaPath = path.join(__dirname, 'panelflow-latest-schema.sql');
        const rawContent = fs.readFileSync(schemaPath, 'utf8');
        const json = JSON.parse(rawContent);
        const sql = json.data;

        console.log('Executing full schema at once...');
        try {
            await client.query(sql);
            console.log('Schema execution completed successfully!');
        } catch (schemaErr) {
            console.error('Schema execution failed:', schemaErr.message);
            throw schemaErr;
        }

        console.log('Creating admin user...');
        // Using a proper UUID for the id column
        const adminId = 'adadbada-0000-4000-a000-000000000001';
        const adminSql = `
            INSERT INTO users (id, email, password, name, role, created_at) 
            VALUES (
                '${adminId}', 
                'admin@opinioninsights.in', 
                '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6Nq5N3q4k2', 
                'System Admin', 
                'admin', 
                NOW()
            ) ON CONFLICT (email) DO NOTHING;
        `;
        await client.query(adminSql);
        console.log('Admin user created successfully!');
        console.log('--------------------------------------------------');
        console.log('LOGIN DETAILS:');
        console.log('URL: https://track.opinioninsights.in/login');
        console.log('Email: admin@opinioninsights.in');
        console.log('Password: Admin@123');
        console.log('--------------------------------------------------');

    } catch (err) {
        console.error('Deployment failed:', err);
    } finally {
        await client.end();
    }
}

deploy();
