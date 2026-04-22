import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function checkProjectSettings() {
  const { data: projects } = await insforge.database
    .from('projects')
    .select('id, project_code, project_name, client_uid_param, uid_params, client_pid_param, oi_prefix')
    .eq('project_code', 'TEST_SRC_260036')
    .limit(5);
  
  console.log('📋 Project Settings:');
  projects?.forEach(p => {
    console.log(`
Project: ${p.project_code}
client_uid_param: '${p.client_uid_param}'
uid_params: '${p.uid_params}'
client_pid_param: '${p.client_pid_param}'
oi_prefix: '${p.oi_prefix}'
`);
  });
}

checkProjectSettings();
