const { Client } = require('pg')

const client = new Client({
    connectionString: 'postgresql://postgres.czzbduzmwzoumgzfryou:WnL4TDs1sSTFAJs7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
})

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.callback_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clickid text NOT NULL,
  project_code text NOT NULL,
  incoming_status text NOT NULL,
  update_result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT callback_events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  project_code text NOT NULL UNIQUE,
  project_name text,
  base_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','paused','deleted'])),
  has_prescreener boolean NOT NULL DEFAULT false,
  prescreener_url text,
  country text DEFAULT 'Global',
  is_multi_country boolean NOT NULL DEFAULT false,
  country_urls jsonb NOT NULL DEFAULT '[]',
  token_prefix text,
  token_counter integer DEFAULT 0,
  complete_cap integer NOT NULL DEFAULT 0,
  complete_target integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  client_pid_param text DEFAULT NULL,
  client_uid_param text DEFAULT NULL,
  oi_prefix text NOT NULL DEFAULT 'oi_',
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  project_code text,
  project_name text,
  uid text,
  user_uid text,
  supplier_token text,
  session_token text,
  supplier text DEFAULT NULL,
  oi_session text DEFAULT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status = ANY (ARRAY['in_progress','started','complete','terminate','quota','security_terminate','duplicate_ip','duplicate_string','click','terminated','quota_full'])),
  started_at timestamptz,
  completed_at timestamptz,
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
  updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT responses_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON public.responses(oi_session);
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON public.responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_status ON public.responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON public.responses(created_at);

CREATE TABLE IF NOT EXISTS public.postback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES public.responses(id),
    url TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    request_body TEXT,
    response_code INTEGER,
    response_body TEXT,
    update_result TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION get_project_analytics()
RETURNS TABLE (
    project_id UUID, project_name TEXT, client_name TEXT, status TEXT,
    clicks BIGINT, completes BIGINT, terminates BIGINT, quota_full BIGINT, conversion_rate NUMERIC
) LANGUAGE sql AS $$
    SELECT p.id, COALESCE(p.project_name, p.project_code), COALESCE(c.name, 'Unknown Client'), p.status,
        COUNT(r.id) FILTER (WHERE r.status IN ('click','in_progress','started')),
        COUNT(r.id) FILTER (WHERE r.status = 'complete'),
        COUNT(r.id) FILTER (WHERE r.status IN ('terminate','terminated')),
        COUNT(r.id) FILTER (WHERE r.status IN ('quota','quota_full')),
        CASE WHEN COUNT(r.id) FILTER (WHERE r.status IN ('click','in_progress','started')) > 0
            THEN ROUND((COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC /
                COUNT(r.id) FILTER (WHERE r.status IN ('click','in_progress','started'))::NUMERIC) * 100, 2)
            ELSE 0 END
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN responses r ON r.project_id = p.id
    WHERE p.status != 'deleted'
    GROUP BY p.id, p.project_name, p.project_code, c.name, p.status;
$$;
`

async function run() {
    console.log('Connecting to Supabase PostgreSQL...')
    try {
        await client.connect()
        console.log('Connected!')
        await client.query(schema)
        console.log('Schema applied successfully!')

        const { rows } = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
        )
        console.log('Tables created:', rows.map(r => r.table_name).join(', '))
    } catch (err) {
        console.error('Error:', err.message)
        process.exit(1)
    } finally {
        await client.end()
        console.log('Done.')
    }
}

run()
