-- Add quota tracking to supplier_project_links
-- Migration: 001_add_quota_columns
-- Date: 2026-04-20

ALTER TABLE supplier_project_links
ADD COLUMN IF NOT EXISTS quota_allocated INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;

-- Add index for quota checks
CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota
ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used)
WHERE status = 'active';

-- Update existing links to have unlimited quota (-1) if not set
UPDATE supplier_project_links
SET quota_allocated = -1, quota_used = 0
WHERE quota_allocated IS NULL;

COMMENT ON COLUMN supplier_project_links.quota_allocated IS 'Quota allocated to this supplier for this project. -1 = unlimited, 0 = no quota, positive = specific limit';
COMMENT ON COLUMN supplier_project_links.quota_used IS 'Current count of completions used by this supplier for this project';
