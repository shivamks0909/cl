import { getUnifiedDb } from './lib/unified-db';
import { RedirectResolver } from './lib/redirect-resolver';

async function testRedirectLogic() {
    const { database: db } = await getUnifiedDb();
    
    const sess2 = '4f2eda31-fe9f-4e96-bd8b-79d2d2d5e4bc'; // working session for OPGH
    
    // Simulate what getLandingPageData + RedirectResolver does
    const { data: resp } = await db.database.from('responses').select('*, suppliers(*)').eq('oi_session', sess2).maybeSingle();
    
    if (resp) {
        const originalUid = resp.client_uid_sent || resp.uid || resp.user_uid;
        
        console.log("Database values:");
        console.log("  uid (Masked):", resp.uid);
        console.log("  client_uid_sent (Original):", resp.client_uid_sent);
        console.log("  resolved originalUid:", originalUid);
        
        const resolution = RedirectResolver.resolve(
            'complete',
            null, // project
            resp.suppliers, // supplier
            null, // link
            originalUid, // UID passed to resolver!
            resp.client_pid || resp.project_code, // PID
            resp.source || 'supplier'
        );
        
        console.log("\nRedirectResolver output:");
        console.log("  isExternal:", resolution.isExternal);
        console.log("  URL:", resolution.url);
    }
}

testRedirectLogic().catch(e => console.error(e));
