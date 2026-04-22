const http = require('http');

const url = 'http://localhost:3000/start/TEST_SRC_260036';

console.log('Testing Direct Link...');

http.get(url, (res) => {
  const location = res.headers['location'];
  console.log('Location:', location);
  
  if (location) {
    const urlObj = new URL(location);
    const oiSession = urlObj.searchParams.get('oi_session');
    
    // Test /complete
    const completeUrl = `http://localhost:3000/complete?oi_session=${oiSession}`;
    console.log('\nTesting /complete for direct...');
    
    http.get(completeUrl, (res2) => {
      console.log('\nComplete Status:', res2.statusCode);
      console.log('Redirect:', res2.headers['location']);
      
      if (!res2.headers['location']) {
        console.log('\n✅ DIRECT FLOW - Showing PanelFlow landing page (no external redirect)');
      }
    });
  }
}).on('error', e => console.error('Error:', e.message));
