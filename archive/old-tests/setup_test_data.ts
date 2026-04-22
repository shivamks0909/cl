import { getDb } from './lib/db';

const db = getDb();

console.log('=== Setting up test data for redirect flow ===\n');

try {
    // Check if project exists
    const project = db.prepare('SELECT id, project_code FROM projects WHERE project_code = ?').get('TEST_PID_001') as any;
    
    if (!project) {
        console.log('Creating project TEST_PID_001...');
        const projectId = 'proj_test_' + Date.now();
        db.prepare(`
            INSERT INTO projects (id, project_code, project_name, base_url, status)
            VALUES (?, ?, ?, ?, 'active')
        `).run(projectId, 'TEST_PID_001', 'TEST_REDIRECT_PROJECT', 'http://localhost:3000');
        console.log('✓ Project created:', projectId);
    } else {
        console.log('✓ Project exists:', project.id);
    }

    // Create a test response with clickid
    const existingResp = db.prepare('SELECT id FROM responses WHERE project_code = ? AND uid = ?').get('TEST_PID_001', 'test01') as any;
    
    if (existingResp) {
        console.log('✓ Test response already exists:', existingResp.id);
    } else {
        const respId = 'resp_test_' + Date.now();
        const clickid = 'click_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        db.prepare(`
            INSERT INTO responses (id, project_id, project_code, uid, clickid, oi_session, status, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            respId,
            project?.id || 'proj_test_...',
            'TEST_PID_001',
            'test01',
            clickid,
            clickid,
            'in_progress',
            'direct'
        );
        
        console.log('✓ Test response created:');
        console.log('  ID:', respId);
        console.log('  UID: test01');
        console.log('  ClickID:', clickid);
        console.log('\nUse this ClickID in your redirect URLs if needed:', clickid);
    }

    // Show current state
    const count = db.prepare('SELECT COUNT(*) as c FROM responses WHERE project_code = ?').get('TEST_PID_001') as any;
    console.log('\nCurrent response count for TEST_PID_001:', count.c);
    
    const latest = db.prepare('SELECT id, uid, clickid, status FROM responses WHERE project_code = ? ORDER BY created_at DESC LIMIT 1').get('TEST_PID_001') as any;
    if (latest) {
        console.log('Latest response:', latest);
    }

} catch (error: any) {
    console.error('ERROR:', error.message);
    throw error;
}
