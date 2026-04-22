-- =====================================================
-- SUPPLIER MANAGEMENT MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Suppliers table
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

-- 2. Supplier <-> Project link table
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

-- 3. Add columns to responses table
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS supplier_name text DEFAULT NULL;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS supplier_token text DEFAULT NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_token ON public.suppliers(supplier_token);
CREATE INDEX IF NOT EXISTS idx_spl_supplier ON public.supplier_project_links(supplier_id);
CREATE INDEX IF NOT EXISTS idx_spl_project ON public.supplier_project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_supplier_token ON public.responses(supplier_token);
