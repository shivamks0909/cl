import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://3gkhhr9f.us-east.supabase.app';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setupTestData() {
  // 1. Create project GOOGLE_TEST
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      project_code: 'GOOGLE_TEST',
      project_name: 'Google Vendor Test',
      base_url: 'https://www.google.com',
      status: 'active',
      project_landing_page_url: 'https://www.google.com'
    })
    .select()
    .single();

  if (projectError) {
    if (projectError.code === '23505') {
      console.log('Project GOOGLE_TEST already exists, fetching...');
      const { data: existingProject } = await supabase
        .from('projects')
        .select('*')
        .eq('project_code', 'GOOGLE_TEST')
        .single();
      project.id = existingProject.id;
    } else {
      console.error('Project creation failed:', projectError);
      throw projectError;
    }
  } else {
    console.log('Created project:', project.project_code);
  }

  // 2. Create supplier TestMackInsights
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .insert({
      name: 'TestMackInsights',
      supplier_token: 'MACK01',
      platform_type: 'custom',
      complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
      terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
      quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}',
      status: 'active'
    })
    .select()
    .single();

  if (supplierError) {
    if (supplierError.code === '23505') {
      console.log('Supplier MACK01 already exists, fetching...');
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('supplier_token', 'MACK01')
        .single();
      supplier.id = existingSupplier.id;
    } else {
      console.error('Supplier creation failed:', supplierError);
      throw supplierError;
    }
  } else {
    console.log('Created supplier:', supplier.supplier_token);
  }

  // 3. Create supplier_project_links
  const { data: link, error: linkError } = await supabase
    .from('supplier_project_links')
    .insert({
      supplier_id: supplier.id,
      project_id: project.id,
      quota_allocated: 100,
      status: 'active'
    })
    .select()
    .single();

  if (linkError) {
    if (linkError.code === '23505') {
      console.log('Link already exists, fetching...');
      const { data: existingLink } = await supabase
        .from('supplier_project_links')
        .select('*')
        .eq('supplier_id', supplier.id)
        .eq('project_id', project.id)
        .single();
      link.id = existingLink.id;
    } else {
      console.error('Link creation failed:', linkError);
      throw linkError;
    }
  } else {
    console.log('Created supplier-project link');
  }

  console.log('Test data setup complete.');
  console.log('Project:', project);
  console.log('Supplier:', supplier);
  console.log('Link:', link);
}

setupTestData().catch(console.error);
