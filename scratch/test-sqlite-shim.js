const { getUnifiedDb } = require('../lib/unified-db');
const crypto = require('crypto');

async function test() {
    process.env.USE_SQLITE = 'true';
    
    console.log('Testing SQLite Unified DB client...');
    const { source, database: db } = await getUnifiedDb();
    console.log('Source:', source);
    
    // 1. Insert an admin
    console.log('\nTesting insert admin...');
    const adminData = {
        email: 'admin@opinioninsights.com',
        password: 'hashedpassword',
        name: 'Admin User',
        role: 'admin'
    };
    const insertRes = await db.from('admins').insert(adminData).select().single();
    if (insertRes.error) {
        console.error('Insert Admin Error:', insertRes.error);
    } else {
        console.log('Insert Admin Success:', insertRes.data);
    }

    // 2. Select admin
    console.log('\nTesting select admin...');
    const selectRes = await db.from('admins').select('*').eq('email', 'admin@opinioninsights.com').maybeSingle();
    if (selectRes.error) {
        console.error('Select Admin Error:', selectRes.error);
    } else {
        console.log('Select Admin Success:', selectRes.data);
    }

    // 3. Insert tracking session
    console.log('\nTesting insert tracking session...');
    const sessionData = {
        sid: crypto.randomUUID(),
        uid: 'test-uid-123',
        pid: 'TEST_SRC_978510',
        status: 'launched',
        metadata: { browser: 'Playwright' }
    };
    const sessionRes = await db.from('tracking_sessions').insert(sessionData).select().single();
    if (sessionRes.error) {
        console.error('Insert Session Error:', sessionRes.error);
    } else {
        console.log('Insert Session Success:', sessionRes.data);
    }

    // 4. Select tracking session
    console.log('\nTesting select tracking session...');
    const selectSessionRes = await db.from('tracking_sessions').select('*').eq('sid', sessionData.sid).maybeSingle();
    if (selectSessionRes.error) {
        console.error('Select Session Error:', selectSessionRes.error);
    } else {
        console.log('Select Session Success:', selectSessionRes.data);
    }
}

test().catch(console.error);
