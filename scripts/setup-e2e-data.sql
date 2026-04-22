-- SQL Setup for E2E Vendor Flow Test

DELETE FROM supplier_project_links WHERE id = '00000000-0000-0000-0000-000000000003';
DELETE FROM projects WHERE id = '00000000-0000-0000-0000-000000000001' OR project_code = 'E2E_PROJ_01';
DELETE FROM suppliers WHERE id = '00000000-0000-0000-0000-000000000002' OR supplier_token = 'TVE01';

INSERT INTO projects (id, project_code, project_name, base_url, status, complete_target) 
VALUES ('00000000-0000-0000-0000-000000000001', 'E2E_PROJ_01', 'E2E Test Project', 'https://survey.example.com?uid={uid}&pid={pid}', 'active', 100);

INSERT INTO suppliers (
    id, name, supplier_token, status, landing_page_url, 
    uid_param_name, pid_param_name, respondent_id_aliases
) VALUES (
    '00000000-0000-0000-0000-000000000002', 'TEST_VENDOR_01', 'TVE01', 'active', 
    'https://vendor-landing.example.com?status={status}&uid={uid}', 
    'uid', 'pid', '["uid", "id", "rid", "respondent_id"]'::jsonb
);

INSERT INTO supplier_project_links (id, supplier_id, project_id, status)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'active');
