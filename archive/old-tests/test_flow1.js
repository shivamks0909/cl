const http = require('http');

// Test 1: DIRECT FLOW
console.log('='.repeat(50));
console.log('TEST 1: DIRECT FLOW');
console.log('='.repeat(50));

const directUrl = 'http://localhost:3000/start/TEST_SRC_260036';

http.get(directUrl, function(res1) {
  const loc1 = res1.headers['location'];
  console.log('Entry Redirect:', loc1);
  
  if (loc1) {
    const u1 = new URL(loc1);
    const oi = u1.searchParams.get('oi_session');
    const uid = u1.searchParams.get('uid');
    console.log('oi_session:', oi);
    console.log('Client UID:', uid);
    
    // Complete
    const completeUrl = 'http://localhost:3000/complete?oi_session=' + oi;
    console.log('\nCompleting survey...');
    
    http.get(completeUrl, function(res2) {
      console.log('\n=== RESULT ===');
      console.log('Final URL:', res2.headers['location'] || 'PanelFlow Page (no redirect)');
      console.log('Status:', res2.statusCode);
    });
  }
});
