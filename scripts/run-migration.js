#!/usr/bin/env node
/**
 * Run full schema migration on InsForge PostgreSQL
 * Usage: node scripts/run-migration.js
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

async function runMigration() {
    const client = new Client({ connectionString: DATABASE_URL })

    try {
        console.log('\n🔗 Connecting to InsForge PostgreSQL...')
        await client.connect()
        console.log('✅ Connected!\n')

        // Test connection
        const test = await client.query('SELECT version()')
        console.log('📊 PostgreSQL:', test.rows[0].version.split(' ').slice(0, 2).join(' '))
        console.log()

        // Read migration SQL
        const sqlPath = path.join(process.cwd(), 'scripts', 'migrate-full-schema.sql')
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Migration file not found: ${sqlPath}`)
        }

        const sql = fs.readFileSync(sqlPath, 'utf-8')
        console.log('📄 Running migration: scripts/migrate-full-schema.sql')
        console.log()

        // Execute migration
        await client.query(sql)
        console.log('✅ Migration completed successfully!\n')

        // Verify tables
        const tables = await client.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `)
        console.log('📋 Tables created:')
        tables.rows.forEach(r => console.log(`   • ${r.tablename}`))
        console.log()

        // Create admin user
        const bcrypt = require('bcryptjs')
        const { randomUUID } = require('crypto')
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@opinioninsights.com'
        const adminPassword = process.env.ADMIN_PASSWORD

        if (!adminPassword) {
            console.warn('⚠️  ADMIN_PASSWORD not set, skipping admin user creation')
        } else {
            const hash = bcrypt.hashSync(adminPassword, 10)

        // Try admins table first, then users
        try {
            await client.query(`
                INSERT INTO admins (id, email, password_hash, created_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
            `, [randomUUID(), adminEmail, hash])
            console.log(`✅ Admin user ready: ${adminEmail}`)
        } catch (e) {
            // Try users table
            try {
                await client.query(`
                    INSERT INTO users (id, email, password, role, status, created_at)
                    VALUES ($1, $2, $3, 'admin', 'active', NOW())
                    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
                `, [randomUUID(), adminEmail, hash])
                console.log(`✅ Admin user ready: ${adminEmail}`)
            } catch (e2) {
                console.log('⚠️  Admin table not found — will be created on first login')
            }
        }
        }

        console.log()
        console.log('🚀 Database is ready for production!\n')
        console.log('   URL:', DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured')
        console.log()

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message)
        if (err.position) {
            console.error('   At SQL position:', err.position)
        }
        process.exit(1)
    } finally {
        await client.end()
    }
}

runMigration()
