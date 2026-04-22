const http = require('http');

// Test with supplier UID
const url = 'http://localhost:3000/start/TEST_SRC_260036?uid=test_user_001&supplier=TEST_SRC_262304';

console.log('Testing UID Conversion...');
console.log('URL:', url);

http.get(url, (res) => {
  const location = res.headers['location'];
  console.log('\nGenerated URL:', location);
  
  if (location) {
    const urlObj = new URL(location);
    console.log('\n📋 URL Parameters:');
    console.log('  uid:', urlObj.searchParams.get('uid'));
    console.log('  pid:', urlObj.searchParams.get('pid'));
    console.log('  respondent_id:', urlObj.searchParams.get('respondent_id'));
    console.log('  oi_uid:', urlObj.searchParams.get('oi_uid'));
    console.log('  oi_session:', urlObj.searchParams.get('oi_session'));
    
    // Check if masked PID is used as UID
    const uid = urlObj.searchParams.get('uid');
    const pid = urlObj.searchParams.get('pid');
    console.log('\n🔍 UID Conversion Check:');
    console.log('  Original UID: test_user_001');
    console.log('  Client UID:', uid);
    console.log('  PID:', pid);
    
    if (uid && uid.startsWith('OP')) {
      console.log('\n✅ WORKING: Using masked PID as UID!');
    } else {
      console.log('\n⚠️ Check: uid =', uid);
    }
  }
}).on('error', e => console.error('Error:', e.message));
