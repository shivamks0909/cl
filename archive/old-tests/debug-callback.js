import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'local.db');
const db = new Database(dbPath);

// Check final status after callback
const testClickId = '6acb2005-7246-406e-a011-b18538a8314e';
const resp = db.prepare('SELECT * FROM responses WHERE clickid = ?').get(testClickId);

console.log('=== Final Response Status ===');
console.log(JSON.stringify(resp, null, 2));

if (resp.status === 'complete') {
  console.log('\n✅ SUCCESS: Status updated to COMPLETE!');
} else {
  console.log('\n❌ STILL FAILED: Status is', resp.status);
}

db.close();
