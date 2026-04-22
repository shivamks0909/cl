const Database = require('better-sqlite3');

function initData() {
  const db = new Database('data/local.db');
  
  // Supplier
  db.prepare(`INSERT OR REPLACE INTO suppliers (id, supplier_token, name, status, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url) 
    VALUES ('supp_mack', 'MACK', 'MACKINSIGHTS', 'active', 'https://vendor.test.com/complete?pid={pid}&uid={uid}', 'https://vendor.test.com/terminate?pid={pid}&uid={uid}', 'https://vendor.test.com/quota?pid={pid}&uid={uid}')`).run();

  // Project
  db.prepare(`INSERT OR REPLACE INTO projects (id, project_code, project_name, status, base_url) 
    VALUES ('proj_live', 'LIVE99', 'LIVE99 Project', 'active', 'https://example.com')`).run();

  // Link
  db.prepare(`INSERT OR REPLACE INTO supplier_project_links (id, project_id, supplier_id, quota_allocated, status) 
    VALUES ('link_1', 'proj_live', 'supp_mack', 100, 'active')`).run();

  console.log('Data initialized!');
  db.close();
}

initData();
