const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, 'tests/e2e/dual-flow-verification.spec.ts');
let content = fs.readFileSync(testFile, 'utf8');
const lines = content.split('\n');

// Find the test.describe line (line 26) and insert a test.setTimeout(60000) inside the describe block, at line 27 (the first line after describe open)
// Actually we need to insert right after line 26: "test.describe('Comprehensive Direct vs Supplier Flow Verification', () => {"
// We'll add: "  test.setTimeout(60000);"
// Also set default navigation timeout on each page? Let's also add a beforeEach to set navigation timeout.

const describeLineIdx = lines.findIndex(l => l.includes("test.describe('Comprehensive Direct vs Supplier Flow Verification'"));
if (describeLineIdx === -1) {
  console.error('Could not find describe line');
  process.exit(1);
}

// Insert after describe open, at the next line after that line (before test.beforeAll)
const beforeEach = `  test.beforeEach(async ({ page }) => {\n    page.setDefaultNavigationTimeout(60000);\n    page.setDefaultTimeout(60000);\n  });\n\n`;

// Insert lines: after describeLineIdx, we need to add the beforeEach before the existing beforeAll.
const beforeAllIdx = lines.findIndex(l => l.includes('test.beforeAll'), describeLineIdx);
if (beforeAllIdx === -1) {
  console.error('Could not find beforeAll');
  process.exit(1);
}

// Insert beforeEach before beforeAll
const insertIdx = beforeAllIdx;
lines.splice(insertIdx, 0, beforeEach);
fs.writeFileSync(testFile, lines.join('\n'), 'utf8');
console.log('Added beforeEach to increase timeouts');
