import { getUnifiedDb } from './lib/unified-db';

async function testResolver() {
    const { database: db } = await getUnifiedDb();
    const clickid = 'bb93186d-ae93-4377-90f7-6c3054fc8638'; // the session from user
    
    const { data: resp } = await db.database
        .from('responses')
        .select('*, suppliers(*)')
        .eq('oi_session', clickid)
        .maybeSingle();

    console.log("Response:", resp?.id, "Supplier ID:", resp?.supplier_id);
    console.log("Supplier Config inside join:", resp?.suppliers);
    
    if (!resp?.suppliers && resp?.supplier_token) {
        console.log("Fetching fallback supplier for token:", resp.supplier_token);
        const { data: s } = await db.database
            .from('suppliers')
            .select('*')
            .eq('supplier_token', resp.supplier_token)
            .maybeSingle();
        console.log("Fallback supplier:", s?.id);
    }
}

testResolver().catch(e => console.error(e));
