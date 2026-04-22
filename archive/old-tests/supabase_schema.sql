-- =====================================================
-- COMPLETE SCHEMA + MIGRATION for czzbduzmwzoumgzfryou
-- Run this entire file in Supabase SQL Editor
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);

-- Callback Events table
CREATE TABLE IF NOT EXISTS public.callback_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clickid text NOT NULL,
  project_code text NOT NULL,
  incoming_status text NOT NULL,
  update_result text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT callback_events_pkey PRIMARY KEY (id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- Projects table (includes param isolation columns)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  project_code text NOT NULL UNIQUE,
  project_name text,
  base_url text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'deleted'::text])),
  has_prescreener boolean NOT NULL DEFAULT false,
  prescreener_url text,
  country text DEFAULT 'Global'::text,
  is_multi_country boolean NOT NULL DEFAULT false,
  country_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  token_prefix text,
  token_counter integer DEFAULT 0,
  complete_cap integer NOT NULL DEFAULT 0,
  complete_target integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  -- URL Parameter Isolation columns (Phase 1 Migration)
  client_pid_param text DEFAULT NULL,
  client_uid_param text DEFAULT NULL,
  oi_prefix text NOT NULL DEFAULT 'oi_',
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- Responses table (includes oi_session column)
CREATE TABLE IF NOT EXISTS public.responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  project_code text,
  project_name text,
  uid text,
  user_uid text,
  supplier_token text,
  session_token text,
  -- URL Parameter Isolation columns (Phase 1 Migration)
  supplier text DEFAULT NULL,
  oi_session text DEFAULT NULL,
  status text NOT NULL DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'started'::text, 'complete'::text, 'terminate'::text, 'quota'::text, 'security_terminate'::text, 'duplicate_ip'::text, 'duplicate_string'::text, 'click'::text, 'terminated'::text, 'quota_full'::text])),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_seconds integer,
  revenue numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  margin numeric DEFAULT 0,
  fraud_score integer NOT NULL DEFAULT 0,
  ip text,
  user_ip text,
  user_agent text,
  device_type text,
  country_code text,
  clickid text UNIQUE,
  hash text,
  last_landing_page text,
  reason text,
  geo_mismatch boolean DEFAULT false,
  vpn_flag boolean DEFAULT false,
  updated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT responses_pkey PRIMARY KEY (id)
);

-- Index for fast oi_session lookups
CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON public.responses(oi_session);
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON public.responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_uid ON public.responses(uid);
CREATE INDEX IF NOT EXISTS idx_responses_status ON public.responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON public.responses(created_at);

-- Postback Logs table
CREATE TABLE IF NOT EXISTS public.postback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES public.responses(id),
    url TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    request_body TEXT,
    response_code INTEGER,
    response_body TEXT,
    update_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Analytics Function
CREATE OR REPLACE FUNCTION get_project_analytics()
RETURNS TABLE (
    project_id UUID,
    project_name TEXT, 
    client_name TEXT,
    status TEXT,
    clicks BIGINT, 
    completes BIGINT, 
    terminates BIGINT, 
    quota_full BIGINT, 
    conversion_rate NUMERIC
) LANGUAGE sql AS $$
    SELECT 
        p.id as project_id,
        COALESCE(p.project_name, p.project_code) as project_name, 
        COALESCE(c.name, 'Unknown Client') as client_name,
        p.status,
        COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started')) as clicks,
        COUNT(r.id) FILTER (WHERE r.status = 'complete') as completes,
        COUNT(r.id) FILTER (WHERE r.status IN ('terminate', 'terminated')) as terminates,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota', 'quota_full')) as quota_full,
        CASE 
            WHEN COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started')) > 0 
            THEN ROUND((COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC / COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started'))::NUMERIC) * 100, 2)
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN responses r ON r.project_id = p.id
    WHERE p.status != 'deleted'
    GROUP BY p.id, p.project_name, p.project_code, c.name, p.status;
$$;

-- ADD MIGRATION COLUMNS TO EXISTING TABLES (safe on fresh install too)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_pid_param text DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_uid_param text DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS oi_prefix text NOT NULL DEFAULT 'oi_';
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS supplier text DEFAULT NULL;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS oi_session text DEFAULT NULL;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS user_uid text DEFAULT NULL;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS user_ip text DEFAULT NULL;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS project_name text DEFAULT NULL;

-- Default admin user (password: admin123 — change immediately!)
INSERT INTO public.admins (email, password_hash) 
VALUES ('admin@opinioninsights.com', '$2b$10$rBqtVMzNuTYCi3XiKZ4dqOBExq8KRqp7RREniuvlnm.0BDPk6qy7G')
ON CONFLICT (email) DO NOTHING;

-- DONE
SELECT 'Schema applied successfully!' as result;
