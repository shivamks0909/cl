const http = require('http');

// Supplier link with TOKEN (not ID)
const projectCode = 'TEST_SRC_260036';
const supplierToken = 'TEST_SRC_262304';

const url = `http://localhost:3000/start/${projectCode}?supplier=${supplierToken}`;

console.log('Testing Supplier Link with TOKEN...');
console.log('URL:', url);

http.get(url, (res) => {
  console.log('\nStatus:', res.statusCode);
  console.log('Location:', res.headers['location']);
  
  if (res.headers['location']) {
    const finalUrl = res.headers['location'];
    // Extract oi_session from URL
    const urlObj = new URL(finalUrl);
    const oiSession = urlObj.searchParams.get('oi_session');
    console.log('\n✅ Entry created!');
    console.log('oi_session:', oiSession);
    
    // Now test /complete with this session
    if (oiSession) {
      const completeUrl = `http://localhost:3000/complete?oi_session=${oiSession}`;
      console.log('\nTesting /complete...');
      console.log('URL:', completeUrl);
      
      http.get(completeUrl, (res2) => {
        console.log('\nComplete Status:', res2.statusCode);
        console.log('Redirect:', res2.headers['location']);
        
        if (res2.headers['location']?.startsWith('http')) {
          console.log('\n🔥 SUPPLIER REDIRECT WORKING!', res2.headers['location']);
        } else if (res2.headers['location']) {
          console.log('\n⚠️ Internal redirect:', res2.headers['location']);
        } else {
          console.log('\n❌ No external redirect - checking PanelFlow page');
        }
      }).on('error', e => console.error('Error:', e.message));
    }
  }
}).on('error', (e) => {
  console.error('Error:', e.message);
});
