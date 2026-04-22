const http = require('http');

// Test callback with oi_session
const oiSession = '02c335ae-42e3-4af5-9bc2-b9c041e25c64';
const url = `http://localhost:3000/api/callback?cid=${oiSession}&type=complete`;

console.log('Testing callback with oi_session...');
console.log('URL:', url);

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Redirect:', res.headers['location']);
    console.log('Response:', data.substring(0, 300));
  });
}).on('error', e => console.error('Error:', e.message));
