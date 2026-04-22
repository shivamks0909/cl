require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const BASE_URL = 'http://localhost:3000';
const pid = 'TEST_PID_001';
const uid = `direct_${Date.now()}`;

fetch(`${BASE_URL}/api/track/entry?pid=${encodeURIComponent(pid)}&uid=${encodeURIComponent(uid)}&source=direct`)
  .then(res => {
    console.log('Response status:', res.status);
    return res.json();
  })
  .then(json => {
    console.log('Response JSON:', JSON.stringify(json, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Fetch error:', err);
    process.exit(1);
  });
