const http = require('http');

// Test on port 3001
const port = 3001;
const url = `http://localhost:${port}/start/TEST_SRC_260036`;

console.log('Testing on port', port);

http.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Location:', res.headers['location']);
}).on('error', e => console.error('Error:', e.message));
