-- Migration: Add Vendor Onboarding and Redirect Mapping fields
-- Targets tables: suppliers, supplier_project_links, projects

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS vendor_slug TEXT UNIQUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS landing_page_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS fallback_landing_page_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS uid_param_name TEXT DEFAULT 'uid';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pid_param_name TEXT DEFAULT 'pid';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status_param_name TEXT DEFAULT 'status';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS respondent_id_aliases JSONB DEFAULT '["uid", "id", "rid", "respondent_id"]'::jsonb;

ALTER TABLE supplier_project_links ADD COLUMN IF NOT EXISTS custom_landing_page_url TEXT;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_landing_page_url TEXT;

-- Update existing records with default slug if missing (optional)
UPDATE suppliers SET vendor_slug = LOWER(REPLACE(name, ' ', '_')) WHERE vendor_slug IS NULL;
