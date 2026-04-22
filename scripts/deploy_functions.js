const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

const FUNCTIONS_SQL = `
-- 1. Increment Quota
CREATE OR REPLACE FUNCTION public.increment_quota(p_project_id uuid, p_supplier_id uuid)
RETURNS boolean AS $$
DECLARE
    v_quota_allocated int;
    v_quota_used int;
BEGIN
    SELECT quota_allocated, quota_used INTO v_quota_allocated, v_quota_used
    FROM public.supplier_project_links
    WHERE project_id = p_project_id AND supplier_id = p_supplier_id AND status = 'active';

    IF NOT FOUND THEN
        -- If no link exists, we might want to auto-create it or return false.
        -- PanelFlow logic usually requires a link to be created in the UI first.
        RETURN FALSE;
    END IF;

    IF v_quota_used < v_quota_allocated OR v_quota_allocated = 0 THEN
        UPDATE public.supplier_project_links
        SET quota_used = quota_used + 1
        WHERE project_id = p_project_id AND supplier_id = p_supplier_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get KPIs
CREATE OR REPLACE FUNCTION public.get_kpis()
RETURNS json AS $$
DECLARE
    result json;
    v_today timestamptz := now() AT TIME ZONE 'UTC';
    v_start_of_day timestamptz := date_trunc('day', v_today);
BEGIN
    SELECT json_build_object(
        'total_projects', (SELECT count(*) FROM projects WHERE deleted_at IS NULL),
        'active_projects', (SELECT count(*) FROM projects WHERE status = 'active' AND deleted_at IS NULL),
        'total_clicks_today', (SELECT count(*) FROM responses WHERE created_at >= v_start_of_day),
        'clicks_today', (SELECT count(*) FROM responses WHERE created_at >= v_start_of_day),
        'total_responses', (SELECT count(*) FROM responses),
        'total_completes_today', (SELECT count(*) FROM responses WHERE status = 'complete' AND created_at >= v_start_of_day),
        'completes_today', (SELECT count(*) FROM responses WHERE status = 'complete' AND created_at >= v_start_of_day),
        'total_terminates_today', (SELECT count(*) FROM responses WHERE status = 'terminate' AND created_at >= v_start_of_day),
        'terminates_today', (SELECT count(*) FROM responses WHERE status = 'terminate' AND created_at >= v_start_of_day),
        'total_quota_full_today', (SELECT count(*) FROM responses WHERE status = 'quota' AND created_at >= v_start_of_day),
        'quotafull_today', (SELECT count(*) FROM responses WHERE status = 'quota' AND created_at >= v_start_of_day),
        'total_in_progress_today', (SELECT count(*) FROM responses WHERE status = 'in_progress' AND created_at >= v_start_of_day),
        'in_progress_today', (SELECT count(*) FROM responses WHERE status = 'in_progress' AND created_at >= v_start_of_day),
        'total_duplicates_today', (SELECT count(*) FROM responses WHERE status = 'duplicate' AND created_at >= v_start_of_day),
        'duplicates_today', (SELECT count(*) FROM responses WHERE status = 'duplicate' AND created_at >= v_start_of_day),
        'total_security_terminates_today', (SELECT count(*) FROM responses WHERE status = 'security' AND created_at >= v_start_of_day),
        'security_terminates_today', (SELECT count(*) FROM responses WHERE status = 'security' AND created_at >= v_start_of_day)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Project Health Metrics
CREATE OR REPLACE FUNCTION public.get_project_health_metrics()
RETURNS TABLE (
    project_id uuid,
    project_code text,
    project_name text,
    clicks_today bigint,
    in_progress_today bigint,
    completes_today bigint,
    terminates_today bigint,
    quotafull_today bigint,
    duplicates_today bigint,
    security_terminates_today bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.project_code,
        p.project_name,
        COUNT(r.id) FILTER (WHERE r.created_at >= date_trunc('day', now())) as clicks_today,
        COUNT(r.id) FILTER (WHERE r.status = 'in_progress' AND r.created_at >= date_trunc('day', now())) as in_progress_today,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at >= date_trunc('day', now())) as completes_today,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate' AND r.created_at >= date_trunc('day', now())) as terminates_today,
        COUNT(r.id) FILTER (WHERE r.status = 'quota' AND r.created_at >= date_trunc('day', now())) as quotafull_today,
        COUNT(r.id) FILTER (WHERE r.status = 'duplicate' AND r.created_at >= date_trunc('day', now())) as duplicates_today,
        COUNT(r.id) FILTER (WHERE r.status = 'security' AND r.created_at >= date_trunc('day', now())) as security_terminates_today
    FROM 
        public.projects p
    LEFT JOIN 
        public.responses r ON p.id = r.project_id
    WHERE 
        p.deleted_at IS NULL
    GROUP BY 
        p.id, p.project_code, p.project_name
    ORDER BY 
        clicks_today DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function deploy() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Supabase. Deploying functions...');
    await client.query(FUNCTIONS_SQL);
    console.log('Functions deployed successfully!');
    await client.end();
  } catch (err) {
    console.error('Deployment failed:', err.message);
    process.exit(1);
  }
}

deploy();
