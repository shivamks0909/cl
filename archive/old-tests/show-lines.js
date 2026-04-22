const fs = require('fs');
const lines = fs.readFileSync('lib/tracking-service.ts', 'utf8').split(/\r?\n/);
for (let i = 137; i <= 160; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
