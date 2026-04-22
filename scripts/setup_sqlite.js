import Database from 'better-sqlite3';
import path from 'path';

function setup() {
  const dbPath = path.resolve('data', 'local.db');
  console.log('Connecting to DB at:', dbPath);
  const db = new Database(dbPath);

  // 1. Supplier
  db.prepare(`
    INSERT INTO suppliers (id, supplier_token, name, status, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url) 
    VALUES ('supp_123', 'QVENDOR', 'QA_VENDOR', 'active', 'https://vendor.test.com/complete?pid={pid}&uid={uid}', 'https://vendor.test.com/terminate?pid={pid}&uid={uid}', 'https://vendor.test.com/quota?pid={pid}&uid={uid}')
    ON CONFLICT(supplier_token) DO UPDATE SET status='active', complete_redirect_url='https://vendor.test.com/complete?pid={pid}&uid={uid}';
  `).run();

  // 2. Project
  db.prepare(`
    INSERT INTO projects (id, project_code, project_name, status, base_url) 
    VALUES ('proj_123', 'LIVETEST', 'LIVE Supplier Test', 'active', 'https://example.com/survey')
    ON CONFLICT(project_code) DO UPDATE SET status='active';
  `).run();

  // 3. Link
  db.prepare(`
    INSERT INTO supplier_project_links (id, project_id, supplier_id, quota_allocated, status) 
    VALUES ('link_123', 'proj_123', 'supp_123', 1000, 'active')
    ON CONFLICT(id) DO UPDATE SET status='active';
  `).run();

  console.log('Test data created in local DB.');
  db.close();
}

setup();
