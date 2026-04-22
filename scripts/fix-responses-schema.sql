-- Migration: Fix responses table schema by adding missing columns
-- Run this on your InsForge/PostgreSQL database

DO $$
BEGIN
    -- project_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'project_name') THEN
        ALTER TABLE responses ADD COLUMN project_name VARCHAR(255);
    END IF;

    -- user_uid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'user_uid') THEN
        ALTER TABLE responses ADD COLUMN user_uid TEXT;
    END IF;

    -- supplier_uid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'supplier_uid') THEN
        ALTER TABLE responses ADD COLUMN supplier_uid TEXT;
    END IF;

    -- client_uid_sent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'client_uid_sent') THEN
        ALTER TABLE responses ADD COLUMN client_uid_sent TEXT;
    END IF;

    -- hash_identifier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'hash_identifier') THEN
        ALTER TABLE responses ADD COLUMN hash_identifier TEXT;
    END IF;

    -- session_token
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'session_token') THEN
        ALTER TABLE responses ADD COLUMN session_token TEXT;
    END IF;

    -- oi_session
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'oi_session') THEN
        ALTER TABLE responses ADD COLUMN oi_session TEXT;
    END IF;

    -- hash
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'hash') THEN
        ALTER TABLE responses ADD COLUMN hash TEXT;
    END IF;

    -- supplier_token
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'supplier_token') THEN
        ALTER TABLE responses ADD COLUMN supplier_token TEXT;
    END IF;

    -- supplier_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'supplier_name') THEN
        ALTER TABLE responses ADD COLUMN supplier_name TEXT;
    END IF;

    -- supplier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'supplier') THEN
        ALTER TABLE responses ADD COLUMN supplier TEXT;
    END IF;

    -- device_type (already exists in some versions but checking)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'device_type') THEN
        ALTER TABLE responses ADD COLUMN device_type TEXT;
    END IF;

    -- last_landing_page
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'last_landing_page') THEN
        ALTER TABLE responses ADD COLUMN last_landing_page TEXT;
    END IF;

    -- raw_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'raw_url') THEN
        ALTER TABLE responses ADD COLUMN raw_url TEXT;
    END IF;

    -- source
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'source') THEN
        ALTER TABLE responses ADD COLUMN source VARCHAR(50) DEFAULT 'project';
    END IF;

    -- entry_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'entry_time') THEN
        ALTER TABLE responses ADD COLUMN entry_time TIMESTAMPTZ;
    END IF;

    -- completion_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'completion_time') THEN
        ALTER TABLE responses ADD COLUMN completion_time TIMESTAMPTZ;
    END IF;

    -- duration_seconds
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'duration_seconds') THEN
        ALTER TABLE responses ADD COLUMN duration_seconds INTEGER;
    END IF;

    -- client_pid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'client_pid') THEN
        ALTER TABLE responses ADD COLUMN client_pid TEXT;
    END IF;

    -- s2s_token
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 's2s_token') THEN
        ALTER TABLE responses ADD COLUMN s2s_token TEXT;
    END IF;

    -- is_fake_suspected
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'is_fake_suspected') THEN
        ALTER TABLE responses ADD COLUMN is_fake_suspected BOOLEAN DEFAULT FALSE;
    END IF;

    -- transaction_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'transaction_id') THEN
        ALTER TABLE responses ADD COLUMN transaction_id TEXT;
    END IF;

    -- is_manual
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'is_manual') THEN
        ALTER TABLE responses ADD COLUMN is_manual INTEGER DEFAULT 0;
    END IF;

END $$;
