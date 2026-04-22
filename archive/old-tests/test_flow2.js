const http = require('http');

// TEST 2: SUPPLIER FLOW
console.log('='.repeat(50));
console.log('TEST 2: SUPPLIER FLOW');
console.log('='.repeat(50));

const supplierUrl = 'http://localhost:3000/start/TEST_SRC_260036?supplier=TEST_SRC_262304&uid=supplier_user_99';

http.get(supplierUrl, function(res1) {
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
      const redirect = res2.headers['location'];
      console.log('\n=== RESULT ===');
      console.log('Final URL:', redirect || 'PanelFlow Page');
      console.log('Status:', res2.statusCode);
      
      if (redirect && redirect.startsWith('http')) {
        console.log('\n✅ SUPPLIER REDIRECT WORKING!');
      } else if (!redirect) {
        console.log('\n⚠️ Showing PanelFlow page (should redirect to supplier)');
      }
    });
  }
});
