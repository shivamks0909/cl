const http = require('http');

// Test 1: DIRECT FLOW
console.log('='.repeat(50));
console.log('TEST 1: DIRECT FLOW');
console.log('='.repeat(50));

const directUrl = 'http://localhost:3000/start/TEST_SRC_260036';
console.log('Step 1: Entry with direct link');
console.log('URL:', directUrl);

http.get(directUrl, (res1) => {
  const loc1 = res1.headers['location'];
  console.log('Redirect:', loc1);
  
  if (loc1) {
    const u1 = new URL(loc1);
    const oi = u1.searchParams.get('oi_session');
    const uid = u1.searchParams.get('uid');
    console.log('oi_session:', oi);
    console.log('Client UID:', uid);
    
    // Step 2: Complete the survey
    const completeUrl = `http://localhost:3000/complete?oi_session=${oi}`;
    console.log('\nStep 2: Complete survey');
    console.log('URL:', completeUrl);
    
    http.get(completeUrl, (res2) => {
      console.log('Status:', res2.statusCode);
      console.log('Redirect:', res2.headers['location']);
      
      console.log('\n✅ Direct Flow Result:');
      console.log('  Status:', res2.statusCode);
      console.log('  Redirect:', res2.headers['location'] || 'PanelFlow Page (200)');
    });
  }
})).on('error', e => console.error('Error:', e.message));
