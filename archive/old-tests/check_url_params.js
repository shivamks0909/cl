const http = require('http');

const url = 'http://localhost:3000/start/TEST_SRC_260036';

console.log('Testing URL generation...');

http.get(url, (res) => {
  const location = res.headers['location'];
  console.log('\nGenerated URL:', location);
  
  if (location) {
    const urlObj = new URL(location);
    console.log('\n📋 URL Parameters:');
    for (const [key, value] of urlObj.searchParams) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Check for uid parameter
    console.log('\n🔍 UID Check:');
    console.log('  uid:', urlObj.searchParams.get('uid'));
    console.log('  oi_uid:', urlObj.searchParams.get('oi_uid'));
    console.log('  respondent_id:', urlObj.searchParams.get('respondent_id'));
  }
}).on('error', e => console.error('Error:', e.message));
