-- =============================================================
-- URL Parameter Isolation Migration
-- Run this on Supabase project: czzbduzmwzoumgzfryou
-- =============================================================

-- 1. New project columns for client param isolation
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_pid_param text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_uid_param text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS oi_prefix text NOT NULL DEFAULT 'oi_';

-- 2. New response columns for session-token-based tracking
ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS supplier text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS oi_session text DEFAULT NULL;

-- 3. Index for fast oi_session lookups on callback/complete/terminate
CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON public.responses(oi_session);

-- DONE. No data changes — existing rows are unaffected.
-- After running this, your project will support oi_session-based
-- response matching with zero PID collision risk.
