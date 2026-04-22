-- Fix Dashboard Analytics and Status Harmonization

CREATE OR REPLACE FUNCTION get_project_health_metrics()
RETURNS TABLE (
    project_id UUID,
    project_code TEXT,
    clicks_today BIGINT,
    completes_today BIGINT,
    duplicates_today BIGINT,
    security_terminates_today BIGINT,
    conversion_rate NUMERIC
) LANGUAGE sql AS $$
    SELECT 
        p.id as project_id,
        p.project_code,
        COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started') AND r.created_at >= CURRENT_DATE) as clicks_today,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at >= CURRENT_DATE) as completes_today,
        COUNT(r.id) FILTER (WHERE r.status IN ('duplicate_ip', 'duplicate_string') AND r.created_at >= CURRENT_DATE) as duplicates_today,
        COUNT(r.id) FILTER (WHERE r.status = 'security_terminate' AND r.created_at >= CURRENT_DATE) as security_terminates_today,
        CASE 
            WHEN COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started') AND r.created_at >= CURRENT_DATE) > 0 
            THEN ROUND((COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at >= CURRENT_DATE)::NUMERIC / 
                  NULLIF(COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started') AND r.created_at >= CURRENT_DATE), 0)::NUMERIC) * 100, 2)
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN responses r ON r.project_id = p.id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id, p.project_code;
$$;

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
        p.project_code as project_name, 
        COALESCE(c.name, 'Unknown Client') as client_name,
        p.status,
        COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started')) as clicks,
        COUNT(r.id) FILTER (WHERE r.status = 'complete') as completes,
        COUNT(r.id) FILTER (WHERE r.status IN ('terminate', 'terminated')) as terminates,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota', 'quota_full')) as quota_full,
        CASE 
            WHEN COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started')) > 0 
            THEN ROUND((COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC / 
                  NULLIF(COUNT(r.id) FILTER (WHERE r.status IN ('click', 'in_progress', 'started')), 0)::NUMERIC) * 100, 2)
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN responses r ON r.project_id = p.id
    GROUP BY p.id, p.project_code, c.name, p.status;
$$;
