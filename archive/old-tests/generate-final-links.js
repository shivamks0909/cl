#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'local.db');
const db = new Database(dbPath);

console.log('=== FINAL TEST SURVEY SETUP ===');

// Clean up schema - remove junk columns from suppliers table
try {
  db.exec(`ALTER TABLE suppliers DROP COLUMN "TEXT"`);
  console.log('  Cleaned up suppliers table');
} catch (e) {
  // Ignore
}

try {
  db.exec(`ALTER TABLE suppliers DROP COLUMN project_landing_page_url`);
  console.log('  Cleaned up projects table');
} catch (e) {
  // Ignore
}

// Check current test data
console.log('\\n=== CURRENT TEST DATA ===');

const project = db.prepare(`SELECT * FROM projects WHERE project_code = ?`).get('TEST_SURVEY_001');
const supplier = db.prepare(`SELECT * FROM suppliers WHERE supplier_token = ?`).get('TEST_SUPPLIER_001');

console.log('Project:', project ? {
  id: project.id,
  code: project.project_code,
  name: project.project_name,
  base_url: project.base_url,
  complete_redirect_url: project.complete_redirect_url || '(NOT SET)'
} : 'NOT FOUND');

console.log('Supplier:', supplier ? {
  id: supplier.id,
  name: supplier.name,
  token: supplier.supplier_token,
  complete_redirect_url: supplier.complete_redirect_url,
  terminate_redirect_url: supplier.terminate_redirect_url
} : 'NOT FOUND');

// Generate test links with actual session tokens for tracking
const baseUrl = 'http://localhost:3000';
const testUid = 'TEST_UID_' + Math.floor(Math.random() * 10000);

// NOTE: The direct link doesn't have supplier_token - that's the "Direct" flow
// and supplier link has supplier_token - that's the "Supplier" flow
const directLink = `${baseUrl}/${project?.project_code || 'TEST_SURVEY_001'}?uid=${testUid}`;
const supplierLink = `${baseUrl}/${project?.project_code || 'TEST_SURVEY_001'}?uid=${testUid}&supplier_token=TEST_SUPPLIER_001`;

console.log('\n=== TEST SURVEY LINKS ===');
console.log('');
console.log('Direct Link (PanelFlow Internal):');
console.log(directLink);
console.log('');
console.log('Supplier Link (Vendor-Connected):');
console.log(supplierLink);
console.log('');
console.log('=== HOW REDIRECT WORKS ===');
console.log('');
console.log('When survey completes via /complete page:');
console.log('- If supplier_token is NOT in URL → source="direct" → redirects to PanelFlow default');
console.log('- If supplier_token IS in URL → source="supplier" → redirects to supplier.complete_redirect_url');
console.log('');
console.log('Supplier Complete Redirect URL: ' + (supplier?.complete_redirect_url || '(NOT SET)'));
console.log('');

db.close();
