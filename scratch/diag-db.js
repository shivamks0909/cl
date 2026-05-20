const SUPABASE_URL = 'https://qvgrzxuonxhwnxitnfvk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Z3J6eHVvbnhod254aXRuZnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2OTM5NSwiZXhwIjoyMDkxOTQ1Mzk1fQ.VNceroffbWIkSlWFEP4oGQly7uRppyg78z9FGnghkJ8';

(async () => {
  console.log('--- DIAGNOSTIC ---');
  
  // Test 1: Query projects
  const r1 = await fetch(SUPABASE_URL + '/rest/v1/projects?limit=2', {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
  });
  console.log('Projects query status:', r1.status);
  const projects = await r1.json();
  console.log('Projects:', projects?.length, projects?.length > 0 ? 'First=' + JSON.stringify(projects[0]) : '');
  
  // Test 2: Query responses
  const r2 = await fetch(SUPABASE_URL + '/rest/v1/responses?limit=2', {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
  });
  console.log('Responses query status:', r2.status);
  const responses = await r2.json();
  console.log('Responses:', responses?.length, responses?.length > 0 ? 'First=' + JSON.stringify(responses[0]) : '');
  
  // Test 3: Insert project
  const r3 = await fetch(SUPABASE_URL + '/rest/v1/projects', {
    method: 'POST',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify([{ project_code: 'DIAG_TEST_01', client_name: 'DIAG', internal_name: 'DIAG', survey_url: 'http://x.com', status: 'active', quota: 10 }])
  });
  console.log('Project insert status:', r3.status, r3.statusText);
  const proj = await r3.json();
  console.log('Project insert result:', JSON.stringify(proj));
  
  // Test 4: Insert response (with existing project id)
  let pid = proj && proj[0] ? proj[0].id : null;
  if (!pid) {
    const check = await fetch(SUPABASE_URL + '/rest/v1/projects?project_code=eq.DIAG_TEST_01&limit=1', {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
    });
    const found = await check.json();
    if (found && found[0]) pid = found[0].id;
  }
  if (pid) {
    const r4 = await fetch(SUPABASE_URL + '/rest/v1/responses', {
      method: 'POST',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify([{ project_code: 'DIAG_TEST_01', project_id: pid, uid: 'TEST_DIAG_01', clickid: 'oi_diag_01', oi_session: 'oi_diag_01', status: 'in_progress', ip_address: '127.0.0.1' }])
    });
    console.log('Response insert status:', r4.status, r4.statusText);
    const resp = await r4.json();
    console.log('Response insert result:', JSON.stringify(resp));
  } else {
    console.log('No PID found, skipping response insert');
  }
})();
