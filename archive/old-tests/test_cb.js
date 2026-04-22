const http = require('http');

// Test callback API
const cbUrl = 'http://localhost:3000/api/callback?pid=TEST_SRC_260036&cid=test-session-new-123&type=complete';

console.log('Testing callback...');

http.get(cbUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Location:', res.headers['location']);
    console.log('Response:', data.substring(0, 300));
  });
}).on('error', e => console.error('Error:', e.message));
