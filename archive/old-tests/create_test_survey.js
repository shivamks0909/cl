const { getDb } = require('./lib/db');
const { v4: uuidv4 } = require('uuid');

const db = getDb();

// Create new test survey project
const projectId = 'proj_test_source_' + Date.now();
const projectCode = 'TEST_SRC_' + Date.now().toString().slice(-6);
const projectName = 'Source-Aware Test Survey';

console.log('Creating new test project...');
console.log('Project ID:', projectId);
console.log('Project Code:', projectCode);

// Insert test project
db.prepare(`
  INSERT INTO projects (id, project_code, project_name, base_url, source, status, has_prescreener)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  projectId,
  projectCode,
  projectName,
  'http://localhost:3000/mock-survey',
  'manual',
  'active',
  0
);

// Create test supplier for the project
const supplierId = 'supp_test_src_' + Date.now();
db.prepare(`
  INSERT INTO suppliers (id, name, supplier_token, status, complete_redirect_url)
  VALUES (?, ?, ?, ?, ?)
`).run(
  supplierId,
  'Test Source Supplier',
  'TEST_SRC_' + Date.now().toString().slice(-6),
  'active',
  'https://supplier-landing.example.com/thank-you'
);

// Link supplier to project
db.prepare(`
  INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, status)
  VALUES (?, ?, ?, ?, ?)
`).run(
  uuidv4(),
  supplierId,
  projectId,
  100,
  'active'
);

console.log('\n✅ Project created successfully!');
console.log('Project Code:', projectCode);

// Generate links
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const directLink = `${baseUrl}/start/${projectCode}`;
const supplierLink = `${baseUrl}/start/${projectCode}?supplier=${supplierId}`;

console.log('\n📋 Generated Links:');
console.log('Direct Link:', directLink);
console.log('Supplier Link:', supplierLink);

console.log('\n✅ Setup complete!');
console.log('\nNow you can test the survey flow:');
console.log('1. Open Direct Link → Complete survey → Should redirect to PanelFlow landing page');
console.log('2. Open Supplier Link → Complete survey → Should redirect to supplier landing page');
console.log('3. Both should record responses in database with correct source');
