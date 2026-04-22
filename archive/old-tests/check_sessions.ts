import { getUnifiedDb } from './lib/unified-db';

async function checkSession() {
    const { database: db } = await getUnifiedDb();
    
    const sess1 = 'bb93186d-ae93-4377-90f7-6c3054fc8638'; // user's failed session
    const sess2 = '4f2eda31-fe9f-4e96-bd8b-79d2d2d5e4bc'; // my working session
    
    console.log("Fetching user session:", sess1);
    const { data: d1 } = await db.from('responses').select('*, suppliers(*)').eq('oi_session', sess1).maybeSingle();
    console.log("d1 supplier_id:", d1?.supplier_id);
    console.log("d1 supplier_token:", d1?.supplier_token);
    console.log("d1 source:", d1?.source);

    console.log("\nFetching working session:", sess2);
    const { data: d2 } = await db.from('responses').select('*, suppliers(*)').eq('oi_session', sess2).maybeSingle();
    console.log("d2 supplier_id:", d2?.supplier_id);
    console.log("d2 supplier_token:", d2?.supplier_token);
    console.log("d2 source:", d2?.source);
}

checkSession().catch(e => console.error(e));
