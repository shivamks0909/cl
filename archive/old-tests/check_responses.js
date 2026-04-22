import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function checkResponses() {
  const { data: responses } = await insforge.database
    .from('responses')
    .select('id, clickid, project_code, source, supplier, supplier_token, status, created_at')
    .eq('project_code', 'TEST_SRC_260036')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('📋 Responses:');
  responses?.forEach(r => {
    console.log(`
clickid: ${r.clickid?.substring(0,8)}...
source: ${r.source}
supplier: ${r.supplier}
supplier_token: ${r.supplier_token}
status: ${r.status}
`);
  });
}

checkResponses();
