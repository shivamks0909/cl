-- =====================================================
-- ADD MISSING COLUMNS TO PROJECTS TABLE
-- Run this on the Supabase/PostgreSQL database
-- =====================================================

-- Add complete_target column (quota target)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS complete_target INTEGER;

-- Note: Other PID fields are already present in the schema:
-- pid_prefix, pid_counter, pid_padding, force_pid_as_uid, target_uid,
-- client_pid_param, client_uid_param, oi_prefix, uid_params
