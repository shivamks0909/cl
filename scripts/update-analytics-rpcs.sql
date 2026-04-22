CREATE OR REPLACE FUNCTION get_kpis()
RETURNS JSON AS $$
DECLARE
    today DATE := CURRENT_DATE;
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_projects', (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL),
        'active_projects', (SELECT COUNT(*) FROM projects WHERE status = 'active' AND deleted_at IS NULL),
        'total_clicks_today', (SELECT COUNT(*) FROM responses WHERE created_at::DATE = today),
        'clicks_today', (SELECT COUNT(*) FROM responses WHERE created_at::DATE = today),
        'direct_clicks_today', (SELECT COUNT(*) FROM responses WHERE source = 'direct' AND created_at::DATE = today),
        'supplier_clicks_today', (SELECT COUNT(*) FROM responses WHERE source != 'direct' AND created_at::DATE = today),
        'total_responses', (SELECT COUNT(*) FROM responses),
        'total_completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND created_at::DATE = today),
        'completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND created_at::DATE = today),
        'direct_completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND source = 'direct' AND created_at::DATE = today),
        'supplier_completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND source != 'direct' AND created_at::DATE = today),
        'total_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'terminate' AND created_at::DATE = today),
        'terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'terminate' AND created_at::DATE = today),
        'direct_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'terminate' AND source = 'direct' AND created_at::DATE = today),
        'supplier_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'terminate' AND source != 'direct' AND created_at::DATE = today),
        'total_quota_full_today', (SELECT COUNT(*) FROM responses WHERE status IN ('quota_full', 'quota') AND created_at::DATE = today),
        'quotafull_today', (SELECT COUNT(*) FROM responses WHERE status IN ('quota_full', 'quota') AND created_at::DATE = today),
        'direct_quota_full_today', (SELECT COUNT(*) FROM responses WHERE status IN ('quota_full', 'quota') AND source = 'direct' AND created_at::DATE = today),
        'supplier_quota_full_today', (SELECT COUNT(*) FROM responses WHERE status IN ('quota_full', 'quota') AND source != 'direct' AND created_at::DATE = today),
        'total_in_progress_today', (SELECT COUNT(*) FROM responses WHERE status = 'in_progress' AND created_at::DATE = today),
        'in_progress_today', (SELECT COUNT(*) FROM responses WHERE status = 'in_progress' AND created_at::DATE = today),
        'direct_in_progress_today', (SELECT COUNT(*) FROM responses WHERE status = 'in_progress' AND source = 'direct' AND created_at::DATE = today),
        'supplier_in_progress_today', (SELECT COUNT(*) FROM responses WHERE status = 'in_progress' AND source != 'direct' AND created_at::DATE = today),
        'total_duplicates_today', (SELECT COUNT(*) FROM responses WHERE status IN ('duplicate_ip', 'duplicate_string') AND created_at::DATE = today),
        'duplicates_today', (SELECT COUNT(*) FROM responses WHERE status IN ('duplicate_ip', 'duplicate_string') AND created_at::DATE = today),
        'direct_duplicates_today', (SELECT COUNT(*) FROM responses WHERE status IN ('duplicate_ip', 'duplicate_string') AND source = 'direct' AND created_at::DATE = today),
        'supplier_duplicates_today', (SELECT COUNT(*) FROM responses WHERE status IN ('duplicate_ip', 'duplicate_string') AND source != 'direct' AND created_at::DATE = today),
        'total_security_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'security_terminate' AND created_at::DATE = today),
        'security_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'security_terminate' AND created_at::DATE = today),
        'direct_security_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'security_terminate' AND source = 'direct' AND created_at::DATE = today),
        'supplier_security_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'security_terminate' AND source != 'direct' AND created_at::DATE = today)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_project_analytics()
RETURNS TABLE (
    project_id UUID,
    project_code TEXT,
    project_name TEXT,
    status TEXT,
    clicks BIGINT,
    direct_clicks BIGINT,
    supplier_clicks BIGINT,
    completes BIGINT,
    direct_completes BIGINT,
    supplier_completes BIGINT,
    terminates BIGINT,
    direct_terminates BIGINT,
    supplier_terminates BIGINT,
    quota_full BIGINT,
    direct_quota_full BIGINT,
    supplier_quota_full BIGINT,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.project_code::TEXT,
        p.project_name::TEXT,
        p.status::TEXT,
        COUNT(r.id)::BIGINT as clicks,
        COUNT(r.id) FILTER (WHERE r.source = 'direct')::BIGINT as direct_clicks,
        COUNT(r.id) FILTER (WHERE r.source != 'direct')::BIGINT as supplier_clicks,
        COUNT(r.id) FILTER (WHERE r.status = 'complete')::BIGINT as completes,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.source = 'direct')::BIGINT as direct_completes,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.source != 'direct')::BIGINT as supplier_completes,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate')::BIGINT as terminates,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate' AND r.source = 'direct')::BIGINT as direct_terminates,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate' AND r.source != 'direct')::BIGINT as supplier_terminates,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota'))::BIGINT as quota_full,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota') AND r.source = 'direct')::BIGINT as direct_quota_full,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota') AND r.source != 'direct')::BIGINT as supplier_quota_full,
        CASE 
            WHEN COUNT(r.id) > 0 THEN (COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC / COUNT(r.id)::NUMERIC) * 100
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN responses r ON p.id = r.project_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id, p.project_code, p.project_name, p.status;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_project_health_metrics()
RETURNS TABLE (
    project_id UUID,
    project_code TEXT,
    project_name TEXT,
    clicks_today BIGINT,
    direct_clicks_today BIGINT,
    supplier_clicks_today BIGINT,
    in_progress_today BIGINT,
    direct_in_progress_today BIGINT,
    supplier_in_progress_today BIGINT,
    completes_today BIGINT,
    direct_completes_today BIGINT,
    supplier_completes_today BIGINT,
    terminates_today BIGINT,
    direct_terminates_today BIGINT,
    supplier_terminates_today BIGINT,
    quotafull_today BIGINT,
    direct_quotafull_today BIGINT,
    supplier_quotafull_today BIGINT,
    duplicates_today BIGINT,
    security_terminates_today BIGINT,
    conversion_rate NUMERIC
) AS $$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.project_code::TEXT,
        p.project_name::TEXT,
        COUNT(r.id) FILTER (WHERE r.created_at::DATE = today)::BIGINT as clicks_today,
        COUNT(r.id) FILTER (WHERE r.created_at::DATE = today AND r.source = 'direct')::BIGINT as direct_clicks_today,
        COUNT(r.id) FILTER (WHERE r.created_at::DATE = today AND r.source != 'direct')::BIGINT as supplier_clicks_today,
        COUNT(r.id) FILTER (WHERE r.status = 'in_progress' AND r.created_at::DATE = today)::BIGINT as in_progress_today,
        COUNT(r.id) FILTER (WHERE r.status = 'in_progress' AND r.created_at::DATE = today AND r.source = 'direct')::BIGINT as direct_in_progress_today,
        COUNT(r.id) FILTER (WHERE r.status = 'in_progress' AND r.created_at::DATE = today AND r.source != 'direct')::BIGINT as supplier_in_progress_today,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at::DATE = today)::BIGINT as completes_today,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at::DATE = today AND r.source = 'direct')::BIGINT as direct_completes_today,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at::DATE = today AND r.source != 'direct')::BIGINT as supplier_completes_today,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate' AND r.created_at::DATE = today)::BIGINT as terminates_today,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate' AND r.created_at::DATE = today AND r.source = 'direct')::BIGINT as direct_terminates_today,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate' AND r.created_at::DATE = today AND r.source != 'direct')::BIGINT as supplier_terminates_today,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota') AND r.created_at::DATE = today)::BIGINT as quotafull_today,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota') AND r.created_at::DATE = today AND r.source = 'direct')::BIGINT as direct_quotafull_today,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota') AND r.created_at::DATE = today AND r.source != 'direct')::BIGINT as supplier_quotafull_today,
        COUNT(r.id) FILTER (WHERE r.status IN ('duplicate_ip', 'duplicate_string') AND r.created_at::DATE = today)::BIGINT as duplicates_today,
        COUNT(r.id) FILTER (WHERE r.status = 'security_terminate' AND r.created_at::DATE = today)::BIGINT as security_terminates_today,
        CASE 
            WHEN COUNT(r.id) FILTER (WHERE r.created_at::DATE = today) > 0 
            THEN (COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at::DATE = today)::NUMERIC / COUNT(r.id) FILTER (WHERE r.created_at::DATE = today)::NUMERIC) * 100
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN responses r ON p.id = r.project_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id, p.project_code, p.project_name
    ORDER BY clicks_today DESC;
END;
$$ LANGUAGE plpgsql;
