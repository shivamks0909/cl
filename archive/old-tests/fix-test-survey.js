#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'local.db');
const db = new Database(dbPath);

console.log('=== FIXING TEST SURVEY SETUP ===');

// Update project base_url to local mock-survey
const result1 = db.prepare(`
  UPDATE projects 
  SET base_url = 'http://localhost:3000/mock-survey'
  WHERE project_code = 'TEST_SURVEY_001'
`).run();
console.log(result1.changes > 0 ? '✓ Updated project base_url to /mock-survey' : '✗ Project not found');

// Fix supplier redirect
const result2 = db.prepare(`
  UPDATE suppliers 
  SET complete_redirect_url = 'https://example.com/supplier/thanks'
  WHERE supplier_token = 'TEST_SUPPLIER_001'
`).run();
console.log(result2.changes > 0 ? '✓ Updated supplier complete_redirect_url' : '✗ Supplier not found');

// Verify (without missing columns)
const project = db.prepare(`SELECT id, project_code, base_url FROM projects WHERE project_code = ?`).get('TEST_SURVEY_001');
const supplier = db.prepare(`SELECT id, name, supplier_token, complete_redirect_url FROM suppliers WHERE supplier_token = ?`).get('TEST_SUPPLIER_001');

console.log('\n=== CURRENT STATE ===');
console.log('Project:', project);
console.log('Supplier:', supplier);

const testUid = 'TESTUSER_' + Math.floor(Math.random() * 99999);

console.log('\n=== CORRECT TEST LINKS ===');
console.log('');
console.log('▶ Direct Link (Opens mock survey → PanelFlow landing page):');
console.log(`  http://localhost:3000/track?code=TEST_SURVEY_001&uid=${testUid}`);
console.log('');
console.log('▶ Supplier Link (Opens mock survey → Supplier landing page):');
console.log(`  http://localhost:3000/track?code=TEST_SURVEY_001&uid=${testUid}_S&supplier=TEST_SUPPLIER_001`);

db.close();
