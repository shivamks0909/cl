import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = path.join(dataDir, 'local.db')
  db = new Database(dbPath)

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL')

  // Initialize schema
  initializeSchema(db)

  return db
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Projects table - complete schema with all mapping fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_code TEXT NOT NULL UNIQUE,
      project_name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      client_id TEXT DEFAULT '',
      country TEXT DEFAULT 'Global',
      is_multi_country INTEGER DEFAULT 0,
      has_prescreener INTEGER DEFAULT 0,
      prescreener_url TEXT DEFAULT '',
      complete_target INTEGER,
      country_urls TEXT DEFAULT '[]',
      pid_prefix TEXT DEFAULT '',
      pid_counter INTEGER DEFAULT 1,
      pid_padding INTEGER DEFAULT 2,
      force_pid_as_uid INTEGER DEFAULT 0,
      target_uid TEXT DEFAULT '',
      client_pid_param TEXT DEFAULT '',
      client_uid_param TEXT DEFAULT '',
      oi_prefix TEXT DEFAULT 'oi_',
      uid_params TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `)

  // Check if source column exists, if not add it
  const projectColumns = db.pragma('table_info(projects)')
  const hasProjectSource = (projectColumns as any[]).some(col => col.name === 'source')

  if (!hasProjectSource) {
    db.exec(`ALTER TABLE projects ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'`)
  }

  // Responses table - nullable project_id for external tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      project_code TEXT,
      project_name TEXT,
      uid TEXT,
      user_uid TEXT,
      supplier_uid TEXT,
      supplier_id TEXT,
      client_uid_sent TEXT,
      hash_identifier TEXT,
      session_token TEXT,
      oi_session TEXT,
      clickid TEXT UNIQUE NOT NULL,
      hash TEXT,
      supplier_token TEXT,
      supplier_name TEXT,
      supplier TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'terminate', 'quota_full', 'security_terminate', 'duplicate_ip', 'duplicate_string')),
      ip TEXT,
      user_agent TEXT,
      device_type TEXT,
      last_landing_page TEXT,
      start_time TEXT,
      client_pid TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    )
  `)

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      supplier_token TEXT NOT NULL UNIQUE,
      contact_email TEXT,
      platform_type TEXT,
      uid_macro TEXT,
      complete_redirect_url TEXT,
      terminate_redirect_url TEXT,
      quotafull_redirect_url TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Check and add new columns to responses if they don't exist
  const responseColumns = db.pragma('table_info(responses)')
  const columnNames = (responseColumns as any[]).map(col => col.name)

  // Core columns that should exist but may need migration
  const missingColumns: string[] = []

  if (!columnNames.includes('project_name')) {
    missingColumns.push('project_name TEXT')
  }
  if (!columnNames.includes('user_uid')) {
    missingColumns.push('user_uid TEXT')
  }
  if (!columnNames.includes('supplier_uid')) {
    missingColumns.push('supplier_uid TEXT')
  }
  if (!columnNames.includes('supplier_id')) {
    missingColumns.push('supplier_id TEXT')
  }
  if (!columnNames.includes('client_uid_sent')) {
    missingColumns.push('client_uid_sent TEXT')
  }
  if (!columnNames.includes('hash_identifier')) {
    missingColumns.push('hash_identifier TEXT')
  }
  if (!columnNames.includes('session_token')) {
    missingColumns.push('session_token TEXT')
  }
  if (!columnNames.includes('oi_session')) {
    missingColumns.push('oi_session TEXT')
  }
  if (!columnNames.includes('hash')) {
    missingColumns.push('hash TEXT')
  }
  if (!columnNames.includes('supplier_token')) {
    missingColumns.push('supplier_token TEXT')
  }
  if (!columnNames.includes('supplier_name')) {
    missingColumns.push('supplier_name TEXT')
  }
  if (!columnNames.includes('supplier')) {
    missingColumns.push('supplier TEXT')
  }
  if (!columnNames.includes('device_type')) {
    missingColumns.push('device_type TEXT')
  }
  if (!columnNames.includes('country_code')) {
    missingColumns.push('country_code TEXT')
  }
  if (!columnNames.includes('last_landing_page')) {
    missingColumns.push('last_landing_page TEXT')
  }
  if (!columnNames.includes('start_time')) {
    missingColumns.push('start_time TEXT')
  }
  if (!columnNames.includes('duration_seconds')) {
    missingColumns.push('duration_seconds INTEGER')
  }
  if (!columnNames.includes('client_pid')) {
    missingColumns.push('client_pid TEXT')
  }

  // Execute column additions (safe because we checked)
  missingColumns.forEach(colDef => {
    const colName = colDef.split(' ')[0]
    db.exec(`ALTER TABLE responses ADD COLUMN ${colDef}`)
    console.log(`[DB] Added missing column: ${colName}`)
  })

  // Existing checks (kept for backwards compatibility)
  if (!columnNames.includes('raw_url')) {
    db.exec(`ALTER TABLE responses ADD COLUMN raw_url TEXT`)
  }

  if (!columnNames.includes('source')) {
    db.exec(`ALTER TABLE responses ADD COLUMN source TEXT DEFAULT 'project'`)
  }

  if (!columnNames.includes('entry_time')) {
    db.exec(`ALTER TABLE responses ADD COLUMN entry_time TEXT`)
  }

  if (!columnNames.includes('completion_time')) {
    db.exec(`ALTER TABLE responses ADD COLUMN completion_time TEXT`)
  }

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
    CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
    CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
    CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
    CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
    CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);
    
    -- Composite indexes for security and performance
    CREATE INDEX IF NOT EXISTS idx_responses_throttle ON responses(ip, project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_responses_duplicate_uid ON responses(uid, project_id);
    CREATE INDEX IF NOT EXISTS idx_responses_supplier_uid ON responses(supplier_uid);
    CREATE INDEX IF NOT EXISTS idx_responses_supplier_id ON responses(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_active ON supplier_project_links(supplier_id, project_id, status);
  `)

  // Supplier project links table (direct supplier-project association without quota tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_project_links (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(supplier_id, project_id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // Create indexes for supplier links
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_supplier ON supplier_project_links(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_project ON supplier_project_links(project_id);
  `)

  // ============================================
  // S2S CONFIG TABLE (for fraud protection)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS s2s_config (
      project_id TEXT PRIMARY KEY,
      secret_key TEXT NOT NULL,
      allowed_ips TEXT,
      require_s2s_for_complete BOOLEAN DEFAULT 1,
      allow_test_mode BOOLEAN DEFAULT 0,
      unverified_action TEXT DEFAULT 'terminate' CHECK (unverified_action IN ('terminate', 'allow', 'flag')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `)

  // ============================================
  // S2S LOGS TABLE (verification audit)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS s2s_logs (
      id TEXT PRIMARY KEY,
      response_id TEXT,
      hash_match INTEGER,
      ip_match INTEGER,
      timestamp_check INTEGER,
      overall_result INTEGER,
      callback_url TEXT,
      callback_method TEXT,
      callback_status INTEGER,
      callback_response TEXT,
      verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      payload TEXT,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE SET NULL
    )
  `)

  // Create indexes for s2s logs
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_response ON s2s_logs(response_id);
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_result ON s2s_logs(overall_result);
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_verified_at ON s2s_logs(verified_at);
  `)

  // Check and add new columns to responses (S2S fields)
  const responseColsS2S = db.pragma('table_info(responses)')
  const responseColNamesS2S = (responseColsS2S as any[]).map(col => col.name)

  if (!responseColNamesS2S.includes('s2s_token')) {
    db.exec(`ALTER TABLE responses ADD COLUMN s2s_token TEXT`)
  }

  if (!responseColNamesS2S.includes('is_fake_suspected')) {
    db.exec(`ALTER TABLE responses ADD COLUMN is_fake_suspected BOOLEAN DEFAULT 0`)
  }

  // Check and add custom init fields (TrustSample integration)
  if (!responseColNamesS2S.includes('transaction_id')) {
    db.exec(`ALTER TABLE responses ADD COLUMN transaction_id TEXT`)
  }

  if (!responseColNamesS2S.includes('is_manual')) {
    db.exec(`ALTER TABLE responses ADD COLUMN is_manual INTEGER DEFAULT 0`)
  }

  // Session tracking field — links a response to its tracking_session
  if (!responseColNamesS2S.includes('session_id')) {
    db.exec(`ALTER TABLE responses ADD COLUMN session_id TEXT`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id)`)
  }

  // Check and add unverified_action to s2s_config if not exists
  const s2sConfigColumns = db.pragma('table_info(s2s_config)')
  const s2sConfigColumnNames = (s2sConfigColumns as any[]).map(col => col.name)

  if (!s2sConfigColumnNames.includes('unverified_action')) {
    db.exec(`ALTER TABLE s2s_config ADD COLUMN unverified_action TEXT DEFAULT 'terminate'`)
  }

  // ============================================
  // TRACKING_SESSIONS TABLE (secure session layer)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      sid         TEXT NOT NULL UNIQUE,
      uid         TEXT NOT NULL,
      pid         TEXT,
      project_id  TEXT,
      supplier_token TEXT,
      supplier_id TEXT,
      source      TEXT NOT NULL DEFAULT 'direct',
      survey_url  TEXT,
      ip          TEXT,
      user_agent  TEXT,
      country_code TEXT,
      device_type TEXT,
      status      TEXT NOT NULL DEFAULT 'launched'
                  CHECK (status IN ('launched','complete','terminate','quota_full','expired')),
      response_id TEXT,
      metadata    TEXT DEFAULT '{}',
      launched_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      expires_at  TEXT NOT NULL DEFAULT (datetime('now', '+48 hours')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT
    )
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tracking_sessions_sid         ON tracking_sessions(sid);
    CREATE INDEX IF NOT EXISTS idx_tracking_sessions_uid         ON tracking_sessions(uid);
    CREATE INDEX IF NOT EXISTS idx_tracking_sessions_pid         ON tracking_sessions(pid);
    CREATE INDEX IF NOT EXISTS idx_tracking_sessions_project_id  ON tracking_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_tracking_sessions_response_id ON tracking_sessions(response_id);
    CREATE INDEX IF NOT EXISTS idx_tracking_sessions_status      ON tracking_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_tracking_sessions_expires_at  ON tracking_sessions(expires_at);
  `)
  console.log('[DB] tracking_sessions table initialized')

  // ============================================
  // CALLBACK_EVENTS TABLE (for event tracking)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS callback_events (
      id TEXT PRIMARY KEY,
      response_id TEXT,
      project_code TEXT,
      clickid TEXT,
      status TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE SET NULL
    )
  `)

  // ============================================
  // CALLBACK_LOGS TABLE (for callback audit)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS callback_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      project_code TEXT,
      clickid TEXT,
      type TEXT,
      status_mapped TEXT,
      response_code INTEGER,
      response_body TEXT,
      latency_ms INTEGER,
      raw_query TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // ============================================
  // QA LAB TABLES
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_test_runs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      run_id TEXT UNIQUE NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      total_tests INT DEFAULT 0,
      passed INT DEFAULT 0,
      failed INT DEFAULT 0,
      environment TEXT DEFAULT 'development',
      base_url TEXT,
      status TEXT DEFAULT 'running',
      summary TEXT DEFAULT '{}',
      created_by TEXT DEFAULT 'system'
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_test_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      run_id TEXT,
      test_name TEXT NOT NULL,
      test_category TEXT,
      passed BOOLEAN NOT NULL,
      status_code INT,
      db_verify TEXT,
      error_message TEXT,
      execution_time_ms INT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_callback_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      endpoint TEXT,
      pid TEXT,
      uid TEXT,
      clickid TEXT,
      oi_session TEXT,
      status_val TEXT,
      supplier TEXT,
      source TEXT,
      blocked BOOLEAN DEFAULT FALSE,
      block_reason TEXT,
      response_time_ms INT,
      db_response TEXT,
      raw_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_session_inspections (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      clickid TEXT,
      oi_session TEXT,
      pid TEXT,
      uid TEXT,
      supplier TEXT,
      ip_address TEXT,
      user_agent TEXT,
      current_status TEXT,
      callback_count INT DEFAULT 1,
      callback_history TEXT DEFAULT '[]',
      validation_state TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_replay_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      original_callback_id TEXT,
      replayed_at TEXT NOT NULL DEFAULT (datetime('now')),
      response_status INT,
      db_result TEXT,
      replay_type TEXT,
      notes TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_fraud_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      fraud_type TEXT,
      pid TEXT,
      uid TEXT,
      ip_address TEXT,
      confidence_score FLOAT,
      blocked BOOLEAN DEFAULT FALSE,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Indexes for QA tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_qa_test_logs_run_id ON qa_test_logs(run_id);
    CREATE INDEX IF NOT EXISTS idx_qa_callback_logs_clickid ON qa_callback_logs(clickid);
    CREATE INDEX IF NOT EXISTS idx_qa_session_inspections_clickid ON qa_session_inspections(clickid);
    CREATE INDEX IF NOT EXISTS idx_qa_session_inspections_oi_session ON qa_session_inspections(oi_session);
    CREATE INDEX IF NOT EXISTS idx_qa_fraud_logs_pid ON qa_fraud_logs(pid);
  `)

  // Create fallback project if not exists
  try {
    const fallbackProject = db.prepare(`
      SELECT id FROM projects WHERE project_code = 'external_traffic'
    `).get()

    if (!fallbackProject) {
      const fallbackId = `proj_fallback_${Date.now()}`
      db.prepare(`
        INSERT INTO projects (id, project_code, project_name, base_url, source, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        fallbackId,
        'external_traffic',
        'External Traffic Bucket',
        'https://external.fallback',
        'auto',
        'active'
      )
      console.log('[DB] Created fallback project: external_traffic')
    }
  } catch (error) {
    console.error('[DB] Error creating fallback project:', error)
  }
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
