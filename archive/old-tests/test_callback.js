const http = require('http');

// Test callback directly
const pid = 'OP006';
const cid = '02c335ae-42e3-4af5-9bc2-b9c041e25c64';
const url = `http://localhost:3000/api/callback?pid=${pid}&cid=${cid}&type=complete`;

console.log('Testing callback...');
console.log('URL:', url);

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
}).on('error', e => console.error('Error:', e.message));
