import Database from 'better-sqlite3';
import path from 'path';

function testSupplierFlow() {
  const dbPath = path.resolve('data', 'local.db');
  console.log('DB:', dbPath);
  const db = new Database(dbPath);

  console.log('\n=== TEST 1: Check Supplier Exists ===');
  const supp = db.prepare('SELECT * FROM suppliers WHERE supplier_token = ?').get('MACK');
  console.log('Supplier:', supp ? 'EXISTS' : 'NOT FOUND');
  if (supp) console.log(supp);

  console.log('\n=== TEST 2: Check Project Exists ===');
  const proj = db.prepare('SELECT * FROM projects WHERE project_code = ?').get('LIVE99');
  console.log('Project:', proj ? 'EXISTS' : 'NOT FOUND');
  if (proj) console.log(proj);

  console.log('\n=== TEST 3: Check Link Exists ===');
  const link = db.prepare('SELECT * FROM supplier_project_links WHERE project_id = ?').get(proj?.id);
  console.log('Link:', link ? 'EXISTS' : 'NOT FOUND');
  if (link) console.log(link);

  db.close();
}

testSupplierFlow();
