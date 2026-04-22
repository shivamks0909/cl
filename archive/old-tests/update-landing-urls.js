#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'local.db');
const db = new Database(dbPath);

console.log('=== UPDATING LANDING PAGE URLs FOR TEST ===');

// Update project landing page URL (PanelFlow internal)
try {
  const result = db.prepare(`
    UPDATE projects 
    SET project_landing_page_url = ? 
    WHERE project_code = ?
  `).run('http://localhost:3000/', 'TEST_SURVEY_001');
  
  if (result.changes > 0) {
    console.log('✓ Updated project landing page URL to: http://localhost:3000/');
  } else {
    console.log('✗ Failed to update project landing page URL');
  }
} catch (e) {
  console.error('Error updating project landing page URL:', e.message);
}

// Update supplier landing page URL
try {
  const result = db.prepare(`
    UPDATE suppliers 
    SET landing_page_url = ? 
    WHERE supplier_token = ?
  `).run('https://example.com/supplier/thanks', 'TEST_SUPPLIER_001');
  
  if (result.changes > 0) {
    console.log('✓ Updated supplier landing page URL to: https://example.com/supplier/thanks');
  } else {
    console.log('✗ Failed to update supplier landing page URL');
  }
} catch (e) {
  console.error('Error updating supplier landing page URL:', e.message);
}

// Also update the supplier's complete redirect URL to include parameter replacement
try {
  const result = db.prepare(`
    UPDATE suppliers 
    SET complete_redirect_url = ? 
    WHERE supplier_token = ?
  `).run('https://example.com/supplier/thanks?uid={uid}', 'TEST_SUPPLIER_001');
  
  if (result.changes > 0) {
    console.log('✓ Updated supplier complete redirect URL to: https://example.com/supplier/thanks?uid={uid}');
  } else {
    console.log('✗ Failed to update supplier complete redirect URL');
  }
} catch (e) {
  console.error('Error updating supplier complete redirect URL:', e.message);
}

console.log('\\n=== VERIFICATION ===');

// Verify the updates
try {
  const project = db.prepare(`SELECT project_landing_page_url FROM projects WHERE project_code = ?`).get('TEST_SURVEY_001');
  const supplier = db.prepare(`SELECT landing_page_url, complete_redirect_url FROM suppliers WHERE supplier_token = ?`).get('TEST_SUPPLIER_001');
  
  if (project && supplier) {
    console.log(`Project Landing Page URL: ${project.project_landing_page_url}`);
    console.log(`Supplier Landing Page URL: ${supplier.landing_page_url}`);
    console.log(`Supplier Complete Redirect URL: ${supplier.complete_redirect_url}`);
  }
} catch (e) {
  console.error('Error verifying updates:', e.message);
}

db.close();
