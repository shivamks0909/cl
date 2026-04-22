const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- Migration: Add Vendor Onboarding and Redirect Mapping fields
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS vendor_slug TEXT UNIQUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS landing_page_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS fallback_landing_page_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS uid_param_name TEXT DEFAULT 'uid';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pid_param_name TEXT DEFAULT 'pid';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status_param_name TEXT DEFAULT 'status';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS respondent_id_aliases JSONB DEFAULT '["uid", "id", "rid", "respondent_id"]'::jsonb;

ALTER TABLE supplier_project_links ADD COLUMN IF NOT EXISTS custom_landing_page_url TEXT;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_landing_page_url TEXT;

-- Update existing records with default slug if missing
UPDATE suppliers SET vendor_slug = LOWER(REPLACE(name, ' ', '_')) WHERE vendor_slug IS NULL;
`;

async function run() {
  try {
    await client.connect();
    console.log('Connected to database...');
    await client.query(sql);
    console.log('✅ Vendor Onboarding fields added successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
