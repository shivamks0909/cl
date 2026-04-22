import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function addSupplier() {
  console.log('Adding MACKINSIGHTS supplier...');
  
  const { data, error } = await insforge.database
    .from('suppliers')
    .insert([{
      name: 'MACKINSIGHTS',
      supplier_token: 'MACK_001',
      status: 'active',
      complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
      terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
      quota_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}'
    }])
    .select()
    .single();
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Created:', data.id, data.name);
  }
}

addSupplier();
