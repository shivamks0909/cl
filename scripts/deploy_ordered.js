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
        await client.connect();
        
        // 1. DROP ALL
        const tablesToDrop = [
            'callback_logs', 'callback_events', 's2s_logs', 's2s_config', 
            'postback_logs', 'audit_logs', 'responses', 'supplier_project_links', 
            'projects', 'suppliers', 'clients', 'users', 'admins'
        ];
        for (let table of tablesToDrop) {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        // 2. PARSE SQL
        const schemaPath = path.join(__dirname, 'panelflow-latest-schema.sql');
        const json = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        let sql = json.data;

        // Fix missing Primary Keys and missing Extension
        sql = 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n' + sql;
        sql = sql.replace(/id uuid NOT NULL DEFAULT uuid_generate_v4\(\)/g, 'id uuid PRIMARY KEY DEFAULT uuid_generate_v4()');

        // Split by semicolon andNewline
        const rawStatements = sql.split(/;\s*\n/);
        
        const createTables = [];
        const createIndexes = [];
        const alterTables = [];
        const others = [];

        for (let stmt of rawStatements) {
            stmt = stmt.trim();
            if (!stmt) continue;
            
            const upper = stmt.toUpperCase();
            if (upper.includes('CREATE TABLE')) {
                createTables.push(stmt);
            } else if (upper.includes('CREATE INDEX') || upper.includes('CREATE UNIQUE INDEX')) {
                createIndexes.push(stmt);
            } else if (upper.includes('ALTER TABLE')) {
                alterTables.push(stmt);
            } else {
                others.push(stmt);
            }
        }

        console.log(`Statements: Tables(${createTables.length}), Indexes(${createIndexes.length}), Constraints(${alterTables.length})`);

        // 3. EXECUTE IN ORDER
        console.log('Running CREATE TABLE...');
        for (let s of createTables) await client.query(s);
        
        console.log('Running CREATE INDEX...');
        for (let s of createIndexes) await client.query(s);
        
        console.log('Running OTHERS...');
        for (let s of others) await client.query(s);
        
        console.log('Running ALTER TABLE (Constraints)...');
        for (let s of alterTables) await client.query(s);

        console.log('Creating Admin...');
        const adminId = 'adadbada-0000-4000-a000-000000000001';
        await client.query(`
            INSERT INTO users (id, email, password, name, role, created_at) 
            VALUES (
                '${adminId}', 
                'admin@opinioninsights.in', 
                '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6Nq5N3q4k2', 
                'System Admin', 
                'admin', 
                NOW()
            ) ON CONFLICT (email) DO NOTHING;
        `);

        console.log('SUCCESS! Everything is set up.');
        console.log('URL: https://track.opinioninsights.in/login');
        console.log('Email: admin@opinioninsights.in');
        console.log('Password: Admin@123');

    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        await client.end();
    }
}
deploy();
