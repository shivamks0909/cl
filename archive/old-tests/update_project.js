import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function addColumns() {
  // Add missing columns
  const columns = [
    { name: 'client_uid_sent', type: 'TEXT' },
    { name: 'user_uid', type: 'TEXT' },
    { name: 'client_pid', type: 'TEXT' }
  ];
  
  for (const col of columns) {
    try {
      await insforge.database.rpc('add_column_if_not_exists', {
        table_name: 'responses',
        column_name: col.name,
        column_type: col.type
      });
      console.log(`✅ Added column: ${col.name}`);
    } catch (e) {
      // Column might already exist or RPC not available
      console.log(`⚠️ ${col.name}:`, e.message?.substring(0, 50));
    }
  }
}

async function updateProject() {
  // Update project settings for TEST_SRC_260036
  const { error } = await insforge.database
    .from('projects')
    .update({
      client_uid_param: 'respondent_id',
      client_pid_param: 'pid',
      force_pid_as_uid: true,
      pid_prefix: 'OP',
      pid_padding: 3
    })
    .eq('project_code', 'TEST_SRC_260036');
  
  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('✅ Project settings updated!');
  }
}

addColumns().then(() => updateProject());
