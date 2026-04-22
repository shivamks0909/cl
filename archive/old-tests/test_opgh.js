const http = require('http');

const url = 'http://localhost:3000/start/TEST_SRC_260036?supplier=OPGH';

console.log('Testing supplier link with OPGH token:');
console.log('URL:', url);

http.get(url, (res) => {
  console.log('\nStatus:', res.statusCode);
  console.log('Location:', res.headers['location']);
  
  if (res.headers['location']) {
    const u = new URL(res.headers['location']);
    console.log('\nURL params:');
    console.log('  oi_uid:', u.searchParams.get('oi_uid'));
    console.log('  code:', u.searchParams.get('code'));
  }
}).on('error', e => console.error('Error:', e.message));
