-- ============================================================
-- MIGRATION: Secure Session-Based Tracking
-- Purpose: Support survey tracking without manual project creation
--          while preventing fake callback injection.
-- ============================================================

-- 1. tracking_sessions: One row per survey launch.
--    Created at launch time. sid is the cryptographic anchor for callbacks.
CREATE TABLE IF NOT EXISTS tracking_sessions (
    id            TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    sid           TEXT NOT NULL UNIQUE,          -- secure session identifier (UUID v4)
    uid           TEXT NOT NULL,                 -- incoming respondent UID from launch
    pid           TEXT,                          -- project code (nullable for projectless mode)
    project_id    TEXT,                          -- resolved project UUID (nullable)
    supplier_token TEXT,                         -- supplier token if supplier flow
    supplier_id   TEXT,                          -- resolved supplier UUID (nullable)
    source        TEXT NOT NULL DEFAULT 'direct', -- 'direct' | 'supplier' | 'projectless'
    survey_url    TEXT,                          -- destination URL opened by respondent
    ip            TEXT,                          -- launch IP
    user_agent    TEXT,                          -- launch user-agent
    country_code  TEXT,                          -- geoip country at launch
    device_type   TEXT,                          -- Desktop / Mobile / Tablet
    status        TEXT NOT NULL DEFAULT 'launched'
                      CHECK (status IN ('launched','complete','terminate','quota_full','expired')),
    response_id   TEXT,                          -- linked responses.id (set on callback)
    metadata      JSONB DEFAULT '{}'::jsonb,     -- arbitrary extra context
    launched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ,                   -- when callback arrived
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ
);

-- Indexes for fast callback resolution
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_sid         ON tracking_sessions(sid);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_uid         ON tracking_sessions(uid);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_pid         ON tracking_sessions(pid);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_project_id  ON tracking_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_response_id ON tracking_sessions(response_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_status      ON tracking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_expires_at  ON tracking_sessions(expires_at);

-- 2. Add session_id FK to responses (soft link, nullable for backward compat)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'responses' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE responses ADD COLUMN session_id TEXT;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id);

-- 3. Helpful comment
COMMENT ON TABLE tracking_sessions IS
    'Secure session table created at survey launch. '
    'sid is the cryptographic anchor — callbacks are only accepted when a valid sid is present. '
    'Projectless sessions (no project_id) are fully supported.';
