import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'test_validation.db');

/**
 * Reset the test database to a clean state with schema and seed data.
 */
export function resetTestDb(): Database {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Delete existing DB file
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  // Create new database
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Read schema from migration file (we need to adapt PostgreSQL SQL to SQLite)
  // For simplicity, we'll define the minimal schema needed for tests
  const schema = getMinimalSchemaForTests();
  db.exec(schema);

  // Seed test data
  seedTestData(db);

  return db;
}

/**
 * Get minimal SQLite schema adapted from PostgreSQL schema
 */
function getMinimalSchemaForTests(): string {
  return `
    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_code TEXT NOT NULL UNIQUE,
      project_name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      is_multi_country BOOLEAN DEFAULT FALSE,
      country_urls TEXT,
      client_pid_param TEXT DEFAULT 'pid',
      client_uid_param TEXT DEFAULT 'uid',
      oi_prefix TEXT DEFAULT 'oi_',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      supplier_token TEXT NOT NULL UNIQUE,
      complete_redirect_url TEXT,
      terminate_redirect_url TEXT,
      quotafull_redirect_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_suppliers_token ON suppliers(supplier_token);

    -- Supplier Project Links (quota tracking)
    CREATE TABLE IF NOT EXISTS supplier_project_links (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      quota_allocated INTEGER DEFAULT -1,
      quota_used INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(supplier_id, project_id)
    );

    CREATE INDEX IF NOT EXISTS idx_spl_supplier ON supplier_project_links(supplier_id, status);
    CREATE INDEX IF NOT EXISTS idx_spl_project ON supplier_project_links(project_id, status);

    -- Responses
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_code TEXT NOT NULL,
      supplier_uid TEXT,
      client_uid_sent TEXT,
      uid TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      oi_session TEXT UNIQUE NOT NULL,
      clickid TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      ip TEXT,
      user_agent TEXT,
      device_type TEXT,
      country_code TEXT,
      source TEXT DEFAULT 'project',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
    CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
    CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON responses(oi_session);
    CREATE INDEX IF NOT EXISTS idx_responses_uid_project ON responses(uid, project_code);
    CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at DESC);

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
  `;
}

/**
 * Insert deterministic test fixtures
 */
function seedTestData(db: Database): void {
  const now = new Date().toISOString();

  // Projects
  const projects = [
    {
      id: 'proj_valid_001',
      project_code: 'TEST_VALID',
      project_name: 'Test Valid Project',
      base_url: 'https://survey.example.com/study',
      status: 'active',
      is_multi_country: false,
      country_urls: null,
    },
    {
      id: 'proj_multi_002',
      project_code: 'TEST_MULTI',
      project_name: 'Test Multi-Country Project',
      base_url: 'https://survey.example.com/study',
      status: 'active',
      is_multi_country: true,
      country_urls: JSON.stringify([
        { country_code: 'US', target_url: 'https://survey.example.com/us', active: true },
        { country_code: 'GB', target_url: 'https://survey.example.com/gb', active: true },
        { country_code: 'DE', target_url: 'https://survey.example.com/de', active: false },
      ]),
    },
    {
      id: 'proj_paused_003',
      project_code: 'TEST_PAUSED',
      project_name: 'Test Paused Project',
      base_url: 'https://survey.example.com/study',
      status: 'paused',
      is_multi_country: false,
      country_urls: null,
    },
  ];

  const insertProject = db.prepare(`
    INSERT INTO projects (id, project_code, project_name, base_url, status, is_multi_country, country_urls, created_at)
    VALUES (@id, @project_code, @project_name, @base_url, @status, @is_multi_country, @country_urls, @created_at)
  `);

  for (const proj of projects) {
    insertProject.run({
      ...proj,
      created_at: now,
    });
  }

  // Suppliers
  const suppliers = [
    {
      id: 'supp_valid_001',
      name: 'Test Supplier Unlimited',
      supplier_token: 'SUP_VALID',
      complete_redirect_url: 'https://supplier.example.com/complete',
      terminate_redirect_url: 'https://supplier.example.com/terminate',
      quotafull_redirect_url: 'https://supplier.example.com/quotafull',
      status: 'active',
    },
    {
      id: 'supp_quota_002',
      name: 'Test Supplier Quota 5',
      supplier_token: 'SUP_QUOTA',
      complete_redirect_url: 'https://supplier.example.com/complete',
      terminate_redirect_url: 'https://supplier.example.com/terminate',
      quotafull_redirect_url: 'https://supplier.example.com/quotafull',
      status: 'active',
    },
  ];

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url, status, created_at)
    VALUES (@id, @name, @supplier_token, @complete_redirect_url, @terminate_redirect_url, @quotafull_redirect_url, @status, @created_at)
  `);

  for (const supp of suppliers) {
    insertSupplier.run({
      ...supp,
      created_at: now,
    });
  }

  // Supplier Project Links
  const links = [
    {
      id: 'link_001',
      supplier_id: 'supp_valid_001',
      project_id: 'proj_valid_001',
      quota_allocated: -1, // unlimited
      quota_used: 0,
      status: 'active',
    },
    {
      id: 'link_002',
      supplier_id: 'supp_quota_002',
      project_id: 'proj_multi_002',
      quota_allocated: 5,
      quota_used: 0,
      status: 'active',
    },
  ];

  const insertLink = db.prepare(`
    INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status, created_at)
    VALUES (@id, @supplier_id, @project_id, @quota_allocated, @quota_used, @status, @created_at)
  `);

  for (const link of links) {
    insertLink.run({
      ...link,
      created_at: now,
    });
  }
}

/**
 * Get a fresh test database connection (use in beforeEach)
 */
export function getTestDb(): Database {
  return resetTestDb();
}
