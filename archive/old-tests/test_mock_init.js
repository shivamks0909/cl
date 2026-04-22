const http = require('http');

// Test mock-init first
const initUrl = 'http://localhost:3000/api/mock-init';

const postData = JSON.stringify({
  pid: 'TEST_SRC_260036',
  oi_session: 'test-session-new-123',
  uid: 'test-session-new-123'
});

console.log('Testing mock-init...');

const req = http.request(initUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', e => console.error('Error:', e.message));
req.write(postData);
req.end();
