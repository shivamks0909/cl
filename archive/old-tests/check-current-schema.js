#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'local.db');
const db = new Database(dbPath);

console.log('=== CHECKING SUPPLIERS TABLE SCHEMA ===');

const supplierCols = db.prepare(`PRAGMA table_info(suppliers)`).all();
console.log('\\nSuppliers table columns:');
supplierCols.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

console.log('\\n=== CHECKING PROJECTS TABLE SCHEMA ===');

const projectCols = db.prepare(`PRAGMA table_info(projects)`).all();
console.log('\\nProjects table columns:');
projectCols.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

db.close();
