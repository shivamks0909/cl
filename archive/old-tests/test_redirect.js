const http = require('http');

const url = 'http://localhost:3000/start/TEST_SRC_978510';

http.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Location:', res.headers['location']);
  
  // Follow redirect
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
    const nextUrl = res.headers['location'].startsWith('http') 
      ? res.headers['location'] 
      : 'http://localhost:3000' + res.headers['location'];
    
    http.get(nextUrl, (res2) => {
      let data = '';
      res2.on('data', (chunk) => data += chunk);
      res2.on('end', () => {
        console.log('\nFinal Status:', res2.statusCode);
        console.log('Final URL:', res2.url);
        console.log('\nFirst 500 chars of response:');
        console.log(data.substring(0, 500));
      });
    });
  }
}).on('error', (e) => {
  console.error('Error:', e.message);
});
