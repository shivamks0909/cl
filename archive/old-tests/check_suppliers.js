import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function getSupplier() {
  // Check suppliers with TEST prefix
  const { data: suppliers } = await insforge.database
    .from('suppliers')
    .select('id, name, supplier_token, status, complete_redirect_url')
    .ilike('supplier_token', 'TEST_SRC%')
    .limit(5);
  
  console.log('📋 Test Suppliers:');
  suppliers?.forEach(s => {
    console.log(`
ID: ${s.id}
Token: ${s.supplier_token}
Name: ${s.name}
Redirect URL: ${s.complete_redirect_url}
`);
  });
}

getSupplier();
