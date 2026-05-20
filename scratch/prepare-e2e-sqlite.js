const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

function prepare() {
  const dbPath = path.resolve('data', 'local.db');
  console.log('Connecting to local DB at:', dbPath);
  const db = new Database(dbPath);

  // 1. Create tables if not exist (just in case)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_code TEXT NOT NULL UNIQUE,
      project_name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      client_id TEXT,
      country TEXT DEFAULT 'Global',
      is_multi_country BOOLEAN DEFAULT 0,
      oi_prefix TEXT DEFAULT 'oi_',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      supplier_token TEXT NOT NULL UNIQUE,
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      complete_redirect_url TEXT,
      terminate_redirect_url TEXT,
      quotafull_redirect_url TEXT,
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
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(supplier_id, project_id)
    )
  `);

  // 2. Insert test admin
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('admin123', salt);
  db.prepare(`
    INSERT INTO admins (id, email, password_hash)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `).run('admin-001', 'admin@opinioninsights.com', passwordHash);
  console.log('✅ Admin admin@opinioninsights.com / admin123 configured');

  // 3. Insert project
  db.prepare(`
    INSERT INTO projects (id, project_code, project_name, base_url, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(project_code) DO UPDATE SET base_url = EXCLUDED.base_url, status = EXCLUDED.status
  `).run('proj_e2e_session', 'E2E_SESSION_TEST', 'E2E Session Test Project', 'http://localhost:3000/client-survey', 'active');
  console.log('✅ Project E2E_SESSION_TEST configured with local base_url');

  // 4. Insert supplier
  db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, status, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(supplier_token) DO UPDATE SET 
      status = EXCLUDED.status,
      complete_redirect_url = EXCLUDED.complete_redirect_url,
      terminate_redirect_url = EXCLUDED.terminate_redirect_url,
      quotafull_redirect_url = EXCLUDED.quotafull_redirect_url
  `).run(
    'supp_e2e_session', 
    'E2E Supplier', 
    'E2E_SUPPLIER', 
    'active',
    'http://localhost:3000/redirect/complete?pid={pid}&uid={uid}',
    'http://localhost:3000/redirect/terminate?pid={pid}&uid={uid}',
    'http://localhost:3000/redirect/quotafull?pid={pid}&uid={uid}'
  );
  console.log('✅ Supplier E2E_SUPPLIER configured with mock callback redirects');

  // 5. Insert link
  db.prepare(`
    INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(supplier_id, project_id) DO UPDATE SET status = EXCLUDED.status
  `).run('link_e2e_session', 'supp_e2e_session', 'proj_e2e_session', 1000, 'active');
  console.log('✅ Supplier-Project Link configured');

  console.log('🎉 Local DB pristine environment setup completed successfully.');
  db.close();
}

prepare();
