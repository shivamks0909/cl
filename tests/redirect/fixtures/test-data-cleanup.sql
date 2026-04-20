-- Cleanup test fixtures
DELETE FROM supplier_project_links WHERE project_id IN (SELECT id FROM projects WHERE project_code = 'TEST_REDIRECT_PROJECT');
DELETE FROM projects WHERE project_code = 'TEST_REDIRECT_PROJECT';
DELETE FROM suppliers WHERE supplier_token = 'MACK';
DELETE FROM responses WHERE project_code = 'TEST_REDIRECT_PROJECT' OR supplier_token = 'MACK';