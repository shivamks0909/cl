import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function checkResponses() {
  const { data: responses } = await insforge.database
    .from('responses')
    .select('id, clickid, uid, user_uid, client_uid_sent, client_pid, source, status')
    .eq('project_code', 'TEST_SRC_260036')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('📋 Response Records:');
  console.log('================');
  responses?.forEach(r => {
    console.log(`
ClickID: ${r.clickid?.substring(0,8)}...
UID: ${r.uid}
User UID: ${r.user_uid}
Client UID Sent: ${r.client_uid_sent}
Client PID: ${r.client_pid}
Source: ${r.source}
Status: ${r.status}
`);
  });
}

checkResponses();
