-- QA Lab RLS Policies
-- Enable RLS on all QA tables

ALTER TABLE qa_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_callback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_session_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_replay_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_fraud_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all QA tables
CREATE POLICY "qa_service_role_all" ON qa_test_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "qa_service_role_all" ON qa_test_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "qa_service_role_all" ON qa_callback_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "qa_service_role_all" ON qa_session_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "qa_service_role_all" ON qa_replay_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "qa_service_role_all" ON qa_fraud_logs FOR ALL USING (true) WITH CHECK (true);

-- Read-only policy for authenticated users
CREATE POLICY "qa_authenticated_read" ON qa_test_runs FOR SELECT USING (true);
CREATE POLICY "qa_authenticated_read" ON qa_test_logs FOR SELECT USING (true);
CREATE POLICY "qa_authenticated_read" ON qa_callback_logs FOR SELECT USING (true);
CREATE POLICY "qa_authenticated_read" ON qa_session_inspections FOR SELECT USING (true);
CREATE POLICY "qa_authenticated_read" ON qa_replay_logs FOR SELECT USING (true);
CREATE POLICY "qa_authenticated_read" ON qa_fraud_logs FOR SELECT USING (true);
