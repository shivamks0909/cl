require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const BASE_URL = 'http://localhost:3000';
const pid = 'TEST_PID_001';
// Use a fresh UID
const uid = 'direct_' + Date.now();
// First, create an entry to get a clickid
async function testRedirectFlow() {
  // 1. Create entry
  const entryRes = await fetch(`${BASE_URL}/api/track/entry?pid=${pid}&uid=${uid}&source=direct`);
  const entryJson = await entryRes.json();
  console.log('Entry response:', JSON.stringify(entryJson, null, 2));
  if (!entryJson.success || !entryJson.token) {
    console.error('Entry failed');
    process.exit(1);
  }
  const clickid = entryJson.token;
  // 2. Test complete redirect endpoint
  const redirectRes = await fetch(`${BASE_URL}/redirect/complete?pid=${pid}&uid=${uid}&clickid=${clickid}`);
  console.log('Redirect status:', redirectRes.status);
  const html = await redirectRes.text();
  console.log('HTML snippet:', html.substring(0, 300));
  // Check if page contains something like "PanelFlow"
  if (html.includes('PanelFlow') || html.includes('Complete')) {
    console.log('✅ Looks good: Contains expected content');
  } else {
    console.log('⚠️ Does not contain expected content');
  }
  process.exit(0);
}
testRedirectFlow().catch(err => {
  console.error(err);
  process.exit(1);
});
