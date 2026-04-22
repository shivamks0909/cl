-- Insert test data for redirect testing suite
-- Run this against the test Supabase database before tests

DO $$
DECLARE
    -- Fixed IDs for predictable testing
    project_id UUID := '00000000-0000-0000-0000-000000000200';
    supplier_id UUID := '00000000-0000-0000-0000-000000000201';
    link_id UUID := '00000000-0000-0000-0000-000000000202';
BEGIN
    -- Clean up existing test data first (idempotent)
    DELETE FROM supplier_project_links WHERE project_id = project_id;
    DELETE FROM projects WHERE id = project_id;
    DELETE FROM suppliers WHERE supplier_token = 'MACK';

    -- Create Project with PID generation enabled
    INSERT INTO projects (id, project_code, project_name, base_url, status, complete_target, pid_prefix, pid_padding, pid_counter)
    VALUES (
        project_id,
        'TEST_REDIRECT_PROJECT',
        'Redirect Test Project',
        'https://survey.mackinsights.com?uid={uid}&pid={pid}',
        'active',
        100,
        'TEST_PID_',
        3,
        1
    );

    -- Create Supplier (MACK)
    INSERT INTO suppliers (
        id, name, supplier_token, status,
        complete_redirect_url,
        terminate_redirect_url,
        quotafull_redirect_url,
        uid_param_name, pid_param_name, respondent_id_aliases
    ) VALUES (
        supplier_id,
        'MackInsights',
        'MACK',
        'active',
        'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid=[uid]',
        'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid=[uid]',
        'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid=[uid]',
        'uid', 'pid', '["uid", "id", "rid", "respondent_id"]'::jsonb
    );

    -- Link supplier to project (quota: -1 = unlimited for testing)
    INSERT INTO supplier_project_links (id, supplier_id, project_id, status, quota_allocated, quota_used)
    VALUES (link_id, supplier_id, project_id, 'active', -1, 0);
END $$;