-- QA Activity Logs Migration
-- Generic log entries for QA Lab internal activities

CREATE TABLE IF NOT EXISTS qa_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,          -- e.g., 'fake_injection', 'manual_redirect', 'custom_test'
  source TEXT NOT NULL,                 -- component or user that initiated
  payload JSONB DEFAULT '{}',           -- arbitrary data associated with the activity
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',          -- optional extra fields (url, status_code, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_qa_activity_logs_type ON qa_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_qa_activity_logs_source ON qa_activity_logs(source);
CREATE INDEX IF NOT EXISTS idx_qa_activity_logs_created_at ON qa_activity_logs(created_at DESC);
