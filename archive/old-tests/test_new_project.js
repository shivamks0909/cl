const http = require('http');

const url = 'http://localhost:3000/start/TEST_SRC_260036';

http.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Location:', res.headers['location']);
}).on('error', (e) => {
  console.error('Error:', e.message);
});
