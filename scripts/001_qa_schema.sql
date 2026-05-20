-- QA Lab Schema Migration
-- Main tables for QA Lab testing

-- qa_test_runs: log of full regression runs
CREATE TABLE IF NOT EXISTS qa_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_tests INT DEFAULT 0,
  passed INT DEFAULT 0,
  failed INT DEFAULT 0,
  environment TEXT DEFAULT 'development',
  base_url TEXT,
  status TEXT DEFAULT 'running',
  summary JSONB DEFAULT '{}',
  created_by TEXT DEFAULT 'system'
);

-- qa_test_logs: individual test results
CREATE TABLE IF NOT EXISTS qa_test_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT REFERENCES qa_test_runs(run_id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_category TEXT,
  passed BOOLEAN NOT NULL,
  status_code INT,
  db_verify JSONB,
  error_message TEXT,
  execution_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- qa_callback_logs: captured callback observations
CREATE TABLE IF NOT EXISTS qa_callback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  db_response JSONB,
  raw_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- qa_session_inspections: session inspection records
CREATE TABLE IF NOT EXISTS qa_session_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clickid TEXT,
  oi_session TEXT,
  pid TEXT,
  uid TEXT,
  supplier TEXT,
  ip_address TEXT,
  user_agent TEXT,
  current_status TEXT,
  callback_count INT DEFAULT 1,
  callback_history JSONB DEFAULT '[]',
  validation_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- qa_replay_logs: callback replay records
CREATE TABLE IF NOT EXISTS qa_replay_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_callback_id UUID,
  replayed_at TIMESTAMPTZ DEFAULT NOW(),
  response_status INT,
  db_result JSONB,
  replay_type TEXT,
  notes TEXT
);

-- qa_fraud_logs: fraud detection records
CREATE TABLE IF NOT EXISTS qa_fraud_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fraud_type TEXT,
  pid TEXT,
  uid TEXT,
  ip_address TEXT,
  confidence_score FLOAT,
  blocked BOOLEAN DEFAULT FALSE,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_qa_test_logs_run_id ON qa_test_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_callback_logs_clickid ON qa_callback_logs(clickid);
CREATE INDEX IF NOT EXISTS idx_qa_session_inspections_clickid ON qa_session_inspections(clickid);
CREATE INDEX IF NOT EXISTS idx_qa_session_inspections_oi_session ON qa_session_inspections(oi_session);
CREATE INDEX IF NOT EXISTS idx_qa_fraud_logs_pid ON qa_fraud_logs(pid);
