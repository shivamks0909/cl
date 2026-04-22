#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'local.db');
const db = new Database(dbPath);

console.log('=== DATABASE SCHEMA CHECK ===');

// Check projects table schema
try {
  const tableInfo = db.prepare(`PRAGMA table_info(projects)`).all();
  console.log('\\nProjects table columns:');
  tableInfo.forEach(col => {
    console.log(`  ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });
} catch (e) {
  console.error('Error checking projects table:', e.message);
}

// Check suppliers table schema
try {
  const tableInfo = db.prepare(`PRAGMA table_info(suppliers)`).all();
  console.log('\\nSuppliers table columns:');
  tableInfo.forEach(col => {
    console.log(`  ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });
} catch (e) {
  console.error('Error checking suppliers table:', e.message);
}

// Check supplier_project_links table schema
try {
  const tableInfo = db.prepare(`PRAGMA table_info(supplier_project_links)`).all();
  console.log('\\nSupplier Project Links table columns:');
  tableInfo.forEach(col => {
    console.log(`  ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });
} catch (e) {
  console.error('Error checking supplier_project_links table:', e.message);
}

// Check if our test records exist
console.log('\\n=== TEST DATA CHECK ===');

try {
  const project = db.prepare(`SELECT * FROM projects WHERE project_code = ?`).get('TEST_SURVEY_001');
  if (project) {
    console.log('\\nTest Project Found:');
    console.log(`  ID: ${project.id}`);
    console.log(`  Project Code: ${project.project_code}`);
    console.log(`  Project Name: ${project.project_name}`);
    console.log(`  Base URL: ${project.base_url}`);
    console.log(`  Landing Page URL: ${project.project_landing_page_url || '(not set)'}`);
    console.log(`  Status: ${project.status}`);
  } else {
    console.log('\\nTest Project TEST_SURVEY_001 NOT FOUND');
  }
} catch (e) {
  console.error('Error querying test project:', e.message);
}

try {
  const supplier = db.prepare(`SELECT * FROM suppliers WHERE supplier_token = ?`).get('TEST_SUPPLIER_001');
  if (supplier) {
    console.log('\\nTest Supplier Found:');
    console.log(`  ID: ${supplier.id}`);
    console.log(`  Name: ${supplier.name}`);
    console.log(`  Supplier Token: ${supplier.supplier_token}`);
    console.log(`  Landing Page URL: ${supplier.landing_page_url || '(not set)'}`);
    console.log(`  Complete Redirect URL: ${supplier.complete_redirect_url || '(not set)'}`);
    console.log(`  Status: ${supplier.status}`);
  } else {
    console.log('\\nTest Supplier TEST_SUPPLIER_001 NOT FOUND');
  }
} catch (e) {
  console.error('Error querying test supplier:', e.message);
}

try {
  const link = db.prepare(`
    SELECT spl.*, s.name as supplier_name, p.project_code as project_code
    FROM supplier_project_links spl
    JOIN suppliers s ON spl.supplier_id = s.id
    JOIN projects p ON spl.project_id = p.id
    WHERE s.supplier_token = ? AND p.project_code = ?
  `).get('TEST_SUPPLIER_001', 'TEST_SURVEY_001');
  
  if (link) {
    console.log('\\nTest Supplier-Project Link Found:');
    console.log(`  ID: ${link.id}`);
    console.log(`  Supplier: ${link.supplier_name} (${link.supplier_id})`);
    console.log(`  Project: ${link.project_code} (${link.project_id})`);
    console.log(`  Quota Allocated: ${link.quota_allocated}`);
    console.log(`  Quota Used: ${link.quota_used}`);
    console.log(`  Status: ${link.status}`);
    console.log(`  Custom Landing Page URL: ${link.custom_landing_page_url || '(not set)'}`);
    console.log(`  Custom Complete URL: ${link.custom_complete_url || '(not set)'}`);
  } else {
    console.log('\\nTest Supplier-Project Link NOT FOUND');
  }
} catch (e) {
  console.error('Error querying test link:', e.message);
}

db.close();
