const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, 'tests/e2e/dual-flow-verification.spec.ts');
let content = fs.readFileSync(testFile, 'utf8');

// The original else block (lines ~40-46)
const originalElseBlock = `       const { data: created } = await supabase.from('projects').insert([{
         project_code: PROJECT_CODE,
         project_name: 'TEST_FULL_FLOW',
         base_url: \`${BASE_URL}/test-survey/${PROJECT_CODE}\`,
         status: 'active'
       }]).select('id').single();
       projectId = created!.id;`;

const newElseBlock = `       const { data: created, error: insertErr } = await supabase.from('projects').insert([{
         project_code: PROJECT_CODE,
         project_name: 'TEST_FULL_FLOW',
         base_url: \`${BASE_URL}/test-survey/${PROJECT_CODE}\`,
         status: 'active'
       }]).select('id').single();
       if (insertErr) {
         console.error('Project insert error:', insertErr);
         throw insertErr;
       }
       if (!created) {
         throw new Error('Project insert returned null data without error');
       }
       projectId = created.id;`;

if (content.includes(originalElseBlock)) {
  content = content.replace(originalElseBlock, newElseBlock);
  fs.writeFileSync(testFile, content, 'utf8');
  console.log('Patched test file successfully');
} else {
  console.error('Original else block not found. Searching for alternative...');
  // Debug: print a snippet around the expected area
  const lines = content.split('\n');
  const start = 35; // approximate line 40
  const snippet = lines.slice(start-5, start+15).join('\n');
  console.error('Snippet:\n', snippet);
  process.exit(1);
}
