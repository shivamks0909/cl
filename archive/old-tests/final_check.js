import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function checkAll() {
  const { data: responses } = await insforge.database
    .from('responses')
    .select('id, clickid, project_code, source, supplier_token, status, created_at')
    .eq('project_code', 'TEST_SRC_260036')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('📋 FINAL Database Records:');
  console.log('========================');
  responses?.forEach(r => {
    console.log(`
ClickID: ${r.clickid?.substring(0,8)}...
Source: ${r.source}
Supplier Token: ${r.supplier_token || 'NONE'}
Status: ${r.status}
Created: ${r.created_at}
`);
  });
}

checkAll();
