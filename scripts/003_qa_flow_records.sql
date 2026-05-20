-- QA Flow Records Table
-- Stores full lifecycle recordings of survey flows

CREATE TABLE IF NOT EXISTS qa_flow_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id TEXT UNIQUE NOT NULL,
  pid TEXT NOT NULL,
  uid TEXT NOT NULL,
  status TEXT DEFAULT 'recording',
  events JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qa_flow_records_pid ON qa_flow_records(pid);
CREATE INDEX IF NOT EXISTS idx_qa_flow_records_uid ON qa_flow_records(uid);
CREATE INDEX IF NOT EXISTS idx_qa_flow_records_created_at ON qa_flow_records(created_at);
