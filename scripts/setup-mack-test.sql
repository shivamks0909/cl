-- Cleanup
DELETE FROM supplier_project_links WHERE project_id IN (SELECT id FROM projects WHERE project_code = 'MACK_PROJ_01');
DELETE FROM projects WHERE project_code = 'MACK_PROJ_01';
DELETE FROM suppliers WHERE supplier_token = 'MACK_TST_01';

-- Create Project with correct PID generation: TEST_PID_001
INSERT INTO projects (id, project_code, project_name, base_url, status, complete_target, pid_prefix, pid_padding, pid_counter) 
VALUES ('00000000-0000-0000-0000-000000000200', 'MACK_PROJ_01', 'Mack Insights Project', 'https://survey.mackinsights.com?uid={uid}&pid={pid}', 'active', 100, 'TEST_PID_', 3, 1);

-- Create Supplier
INSERT INTO suppliers (
    id, name, supplier_token, status, 
    complete_redirect_url, 
    terminate_redirect_url, 
    quotafull_redirect_url,
    uid_param_name, pid_param_name, respondent_id_aliases
) VALUES (
    '00000000-0000-0000-0000-000000000201', 'Mack Insights', 'MACK_TST_01', 'active', 
    'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid=[uid]', 
    'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid=[uid]', 
    'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid=[uid]',
    'uid', 'pid', '["uid", "id", "rid", "respondent_id"]'::jsonb
);

-- Link them
INSERT INTO supplier_project_links (id, supplier_id, project_id, status)
VALUES ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000200', 'active');
