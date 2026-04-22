const http = require('http');

const url = 'http://localhost:3000/start/TEST_SRC_260036';

console.log('Testing:', url);

const req = http.request(url, { method: 'GET' }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Location:', res.headers['location']);
  });
});

req.on('error', e => console.error('REQ Error:', e.message));

req.end();

setTimeout(() => {
  console.log('\nCheck terminal for full error output');
}, 3000);
