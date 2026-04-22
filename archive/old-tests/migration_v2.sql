-- Migration V2: Survey Routing Tracking System Improvements

-- Update Projects Table for PID Generation
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS pid_prefix text,
ADD COLUMN IF NOT EXISTS pid_counter integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS pid_padding integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS force_pid_as_uid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS target_uid text;

-- Update Responses Table for Full UID Transparency and LOI
ALTER TABLE public.responses 
ADD COLUMN IF NOT EXISTS hash_identifier text,
ADD COLUMN IF NOT EXISTS supplier_uid text,
ADD COLUMN IF NOT EXISTS client_uid_sent text,
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS loi_seconds integer;

-- Add Comment for Documentation
COMMENT ON COLUMN public.responses.hash_identifier IS 'Short SHA-256 hash (8 chars) of supplier UID + timestamp for reconciliation';
COMMENT ON COLUMN public.responses.supplier_uid IS 'Original incoming UID from the supplier link';
COMMENT ON COLUMN public.responses.client_uid_sent IS 'PID or UID sent to the client survey URL';
COMMENT ON COLUMN public.responses.loi_seconds IS 'Auto-calculated: end_time - start_time in seconds';

-- Create an index on project_code and project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_responses_project_code ON public.responses(project_code);
CREATE INDEX IF NOT EXISTS idx_responses_supplier_uid ON public.responses(supplier_uid);
