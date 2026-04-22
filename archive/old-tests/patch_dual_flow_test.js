const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, 'tests/e2e/dual-flow-verification.spec.ts');
let content = fs.readFileSync(testFile, 'utf8');

const lines = content.split('\n');

// Lines to replace: 1-indexed 40-46 => zero-indexed indices 39-45
const startIdx = 39;
const endIdx = 45; // inclusive

const newBlock = [
  "       const { data: created, error: insertErr } = await supabase.from('projects').insert([{",
  "         project_code: PROJECT_CODE,",
  "         project_name: 'TEST_FULL_FLOW',",
  "         base_url: `${BASE_URL}/test-survey/${PROJECT_CODE}`,",
  "         status: 'active'",
  "       }]).select('id').single();",
  "       if (insertErr) {",
  "         console.error('Project insert error:', insertErr);",
  "         throw insertErr;",
  "       }",
  "       if (!created) {",
  "         throw new Error('Project insert returned null data without error');",
  "       }",
  "       projectId = created.id;"
];

const newLines = [
  ...lines.slice(0, startIdx),
  ...newBlock,
  ...lines.slice(endIdx + 1) // keep from line 47 onward (original lines after the else block)
];

fs.writeFileSync(testFile, newLines.join('\n'), 'utf8');
console.log('Patched test file: added error handling for project insert');
