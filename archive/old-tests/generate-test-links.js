#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'local.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('Setting up test survey for link generation...');

// Ensure tables exist (same as seed-test-data.js)
db.exec(`
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`);

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_code TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  client_id TEXT,
  is_multi_country BOOLEAN DEFAULT 0,
  country_urls TEXT,
  oi_prefix TEXT DEFAULT 'oi_',
  pid_prefix TEXT,
  pid_counter INTEGER DEFAULT 0,
  pid_padding INTEGER DEFAULT 2,
  force_pid_as_uid BOOLEAN DEFAULT 0,
  target_uid TEXT,
  client_pid_param TEXT,
  client_uid_param TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`);

db.exec(`
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  supplier_token TEXT NOT NULL UNIQUE,
  platform_type TEXT,
  uid_macro TEXT,
  complete_redirect_url TEXT,
  terminate_redirect_url TEXT,
  quotafull_redirect_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`);

db.exec(`
CREATE TABLE IF NOT EXISTS supplier_project_links (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  quota_allocated INTEGER DEFAULT 0,
  quota_used INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(supplier_id, project_id)
)
`);

db.exec(`
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  project_code TEXT,
  project_name TEXT,
  uid TEXT,
  user_uid TEXT,
  supplier_uid TEXT,
  client_uid_sent TEXT,
  hash_identifier TEXT,
  session_token TEXT,
  oi_session TEXT,
  clickid TEXT,
  hash TEXT,
  supplier_token TEXT,
  supplier_name TEXT,
  supplier TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'terminate', 'quota_full', 'security_terminate', 'duplicate_ip', 'duplicate_string')),
  ip TEXT,
  user_agent TEXT,
  device_type TEXT,
  country_code TEXT,
  last_landing_page TEXT,
  start_time TEXT,
  entry_time TEXT,
  completion_time TEXT,
  raw_url TEXT,
  source TEXT DEFAULT 'project',
  duration_seconds INTEGER,
  transaction_id TEXT,
  is_manual INTEGER DEFAULT 0,
  s2s_token TEXT,
  is_fake_suspected BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
)
`);

// Add missing columns if needed
function addMissingColumns(table, needed) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all();
  const names = new Set(existing.map(c => c.name));
  needed.forEach(col => {
    if (!names.has(col.name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.def}`);
      console.log(`  Added ${table}.${col.name}`);
    }
  });
}

addMissingColumns('responses', [
  { name: 'raw_url', def: 'TEXT' },
  { name: 'source', def: "TEXT DEFAULT 'project'" },
  { name: 'entry_time', def: 'TEXT' },
  { name: 'completion_time', def: 'TEXT' },
  { name: 'transaction_id', def: 'TEXT' },
  { name: 'is_manual', def: 'INTEGER DEFAULT 0' },
  { name: 's2s_token', def: 'TEXT' },
  { name: 'is_fake_suspected', def: 'BOOLEAN DEFAULT 0' },
  { name: 'user_uid', def: 'TEXT' },
  { name: 'supplier_uid', def: 'TEXT' },
  { name: 'client_uid_sent', def: 'TEXT' },
  { name: 'hash_identifier', def: 'TEXT' },
  { name: 'session_token', def: 'TEXT' },
  { name: 'oi_session', def: 'TEXT' },
  { name: 'hash', def: 'TEXT' },
  { name: 'supplier_token', def: 'TEXT' },
  { name: 'supplier_name', def: 'TEXT' },
  { name: 'supplier', def: 'TEXT' },
  { name: 'device_type', def: 'TEXT' },
  { name: 'country_code', def: 'TEXT' },
  { name: 'last_landing_page', def: 'TEXT' },
  { name: 'start_time', def: 'TEXT' },
  { name: 'duration_seconds', def: 'INTEGER' }
]);

console.log('Creating indexes...');
db.exec(`
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
CREATE INDEX IF NOT EXISTS idx_responses_transaction_id ON responses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_responses_is_manual ON responses(is_manual);
CREATE INDEX IF NOT EXISTS idx_responses_s2s_token ON responses(s2s_token);
`);

// Create or get test client
const testClientId = 'client_test_survey_001';
try {
  db.prepare('INSERT INTO clients (id, name) VALUES (?, ?)').run(testClientId, 'Test Survey Client');
  console.log('  Client: Test Survey Client');
} catch (e) {
  console.log('  Client: Test Survey Client (already exists)');
}

// Create or get test project
const testProjectCode = 'TEST_SURVEY_001';
const testProjectId = 'proj_test_survey_001';
try {
  const upsertProject = db.prepare(`
    INSERT OR REPLACE INTO projects 
    (id, project_code, project_name, base_url, status, client_id, is_multi_country, oi_prefix, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM projects WHERE id = ?), datetime('now')))
  `);
  
  upsertProject.run(
    testProjectId,
    testProjectCode,
    'Test Survey Project',
    'https://survey.example.com/test-survey',
    'active',
    testClientId,
    0,
    'oi_',
    testProjectId
  );
  console.log(`  Project: ${testProjectCode} (active)`);
} catch (e) {
  console.log(`  Project: ${testProjectCode} (error: ${e.message})`);
}

// Create or get test supplier
const testSupplierToken = 'TEST_SUPPLIER_001';
const testSupplierId = 'supp_test_survey_001';
try {
  const upsertSupplier = db.prepare(`
    INSERT OR REPLACE INTO suppliers 
    (id, name, supplier_token, platform_type, uid_macro, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM suppliers WHERE id = ?), datetime('now')))
  `);
  
  upsertSupplier.run(
    testSupplierId,
    'Test Supplier',
    testSupplierToken,
    'test',
    '{UID}',
    'https://example.com/supplier/thanks?uid={uid}',
    'https://example.com/supplier/terminate?uid={uid}',
    'https://example.com/supplier/quota?uid={uid}',
    'active',
    testSupplierId
  );
  console.log(`  Supplier: ${testSupplierToken} (active)`);
} catch (e) {
  console.log(`  Supplier: ${testSupplierToken} (error: ${e.message})`);
}

// Create or get supplier-project link
const testLinkId = 'link_test_survey_001';
try {
  const upsertLink = db.prepare(`
    INSERT OR REPLACE INTO supplier_project_links 
    (id, supplier_id, project_id, quota_allocated, quota_used, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM supplier_project_links WHERE id = ?), datetime('now')))
  `);
  
  upsertLink.run(
    testLinkId,
    testSupplierId,
    testProjectId,
    1000,  // quota allocated
    0,     // quota used
    'active',
    testLinkId
  );
  console.log(`  Link: ${testLinkId} (active)`);
} catch (e) {
  console.log(`  Link: ${testLinkId} (error: ${e.message})`);
}

// Generate test UID
const testUid = 'TEST_UID_' + Math.floor(Math.random() * 10000);

// Generate links
const baseUrl = 'http://localhost:3000';
const directLink = `${baseUrl}/${testProjectCode}?uid=${testUid}`;
const supplierLink = `${baseUrl}/${testProjectCode}?uid=${testUid}&supplier_token=${testSupplierToken}`;

console.log('\n=== TEST SURVEY LINKS ===');
console.log(`Project Code: ${testProjectCode}`);
console.log(`Supplier Token: ${testSupplierToken}`);
console.log(`Test UID: ${testUid}`);
console.log('');
console.log('Direct Link (PanelFlow Internal):');
console.log(directLink);
console.log('');
console.log('Supplier Link (Vendor-Connected):');
console.log(supplierLink);
console.log('');
console.log('=== TEST INSTRUCTIONS ===');
console.log('1. Test Direct Link Flow:');
console.log(`   - Visit: ${directLink}`);
console.log('   - Complete the survey');
console.log('   - Should redirect to PanelFlow landing page (http://localhost:3000/)');
console.log('   - Check admin/responses to confirm response saved with correct PID/UID');
console.log('');
console.log('2. Test Supplier Link Flow:');
console.log(`   - Visit: ${supplierLink}`);
console.log('   - Complete the survey');
console.log('   - Should redirect to supplier landing page (https://example.com/supplier/thanks?uid=TEST_UID_XXXX)');
console.log('   - Check admin/responses to confirm response saved with correct PID/UID');
console.log('');
console.log('3. Verification Points:');
console.log('   - In both cases, response should be saved in PanelFlow dashboard');
console.log('   - PID and UID should remain consistent throughout the flow');
console.log('   - Source field should show \"direct\" for direct link, \"supplier\" for supplier link');

db.close();
