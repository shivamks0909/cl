const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.czzbduzmwzoumgzfryou:WnL4TDs1sSTFAJs7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  supplier_token text NOT NULL UNIQUE,
  contact_email text DEFAULT NULL,
  platform_type text DEFAULT 'custom',
  uid_macro text DEFAULT '[uid]',
  complete_redirect_url text DEFAULT NULL,
  terminate_redirect_url text DEFAULT NULL,
  quotafull_redirect_url text DEFAULT NULL,
  notes text DEFAULT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.supplier_project_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quota_allocated integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spl_pkey PRIMARY KEY (id),
  CONSTRAINT spl_unique UNIQUE (supplier_id, project_id)
);

ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS supplier_name text DEFAULT NULL;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS supplier_token text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_token ON public.suppliers(supplier_token);
CREATE INDEX IF NOT EXISTS idx_responses_supplier_token ON public.responses(supplier_token);
`;

async function runMigration() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected.');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration completed successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
