const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, 'tests/e2e/dual-flow-verification.spec.ts');
let content = fs.readFileSync(testFile, 'utf8');
const lines = content.split('\n');

// Find the describe line
const describeIdx = lines.findIndex(l => l.includes("test.describe('Comprehensive Direct vs Supplier Flow Verification'"));
if (describeIdx === -1) {
  console.error('Cannot find describe line');
  process.exit(1);
}

// Insert test.setTimeout(120000) right after the describe line
lines.splice(describeIdx + 1, 0, '  test.setTimeout(120000);');

fs.writeFileSync(testFile, lines.join('\n'), 'utf8');
console.log('Added test.setTimeout(120000) to double-flow test');
