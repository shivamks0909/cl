#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'local.db');
const db = new Database(dbPath);

console.log('=== MIGRATING DATABASE SCHEMA ===');

// Add missing columns to projects table
function addMissingColumns(table, needed) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all();
  const names = new Set(existing.map(c => c.name));
  
  needed.forEach(col => {
    if (!names.has(col.name)) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.def}`);
        console.log(`  ✓ Added ${table}.${col.name}`);
      } catch(e) {
        console.log(`  ✗ Failed to add ${table}.${col.name}: ${e.message}`);
      }
    } else {
      console.log(`  - ${table}.${col.name} already exists`);
    }
  });
}

// Columns for projects table
addMissingColumns('projects', [
  { name: 'project_landing_page_url', def: 'TEXT' },
]);

// Columns for suppliers table
addMissingColumns('suppliers', [
  { name: 'vendor_slug', def: 'TEXT' },
  { name: 'landing_page_url', def: 'TEXT' },
  { name: 'fallback_landing_page_url', def: 'TEXT' },
  { name: 'uid_param_name', def: "TEXT DEFAULT 'uid'" },
  { name: 'pid_param_name', def: "TEXT DEFAULT 'pid'" },
  { name: 'status_param_name', def: "TEXT DEFAULT 'status'" },
  { name: 'respondent_id_aliases', def: "TEXT DEFAULT '[\"uid\",\"id\",\"rid\",\"respondent_id\"]'" },
]);

// Columns for supplier_project_links table
addMissingColumns('supplier_project_links', [
  { name: 'custom_landing_page_url', def: 'TEXT' },
]);

console.log('\\n=== UPDATING TEST DATA LANDING URLs ===');

// Update project landing page URL (PanelFlow internal - the platform default)
try {
  const result = db.prepare(`
    UPDATE projects 
    SET project_landing_page_url = 'http://localhost:3000/' 
    WHERE project_code = 'TEST_SURVEY_001'
  `).run();
  
  if (result.changes > 0) {
    console.log('  ✓ Updated project landing page URL to: http://localhost:3000/');
  } else {
    console.log('  - No project to update (TEST_SURVEY_001)');
  }
} catch (e) {
  console.log(`  ✗ Error updating project: ${e.message}`);
}

// Update supplier landing page URL
try {
  const result = db.prepare(`
    UPDATE suppliers 
    SET landing_page_url = 'https://example.com/supplier/thanks' 
    WHERE supplier_token = 'TEST_SUPPLIER_001'
  `).run();
  
  if (result.changes > 0) {
    console.log('  ✓ Updated supplier landing page URL');
  } else {
    console.log('  - No supplier to update (TEST_SUPPLIER_001)');
  }
} catch (e) {
  console.log(`  ✗ Error updating supplier: ${e.message}`);
}

// Also update the supplier's complete redirect URL
try {
  const result = db.prepare(`
    UPDATE suppliers 
    SET complete_redirect_url = 'https://example.com/supplier/thanks?uid={uid}' 
    WHERE supplier_token = 'TEST_SUPPLIER_001'
  `).run();
  
  if (result.changes > 0) {
    console.log('  ✓ Updated supplier complete redirect URL');
  }
} catch (e) {
  console.log(`  ✗ Error updating supplier redirect: ${e.message}`);
}

console.log('\\n=== VERIFICATION ===');

// Verify the updates
try {
  const project = db.prepare(`SELECT project_landing_page_url FROM projects WHERE project_code = ?`).get('TEST_SURVEY_001');
  const supplier = db.prepare(`SELECT landing_page_url, complete_redirect_url FROM suppliers WHERE supplier_token = ?`).get('TEST_SUPPLIER_001');
  
  if (project) {
    console.log(`Project Landing Page URL: ${project.project_landing_page_url}`);
  }
  if (supplier) {
    console.log(`Supplier Landing Page URL: ${supplier.landing_page_url}`);
    console.log(`Supplier Complete Redirect URL: ${supplier.complete_redirect_url}`);
  }
} catch (e) {
  console.error('Error verifying updates:', e.message);
}

db.close();
console.log('\\nMigration complete!');
