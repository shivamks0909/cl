const http = require('http');

// First complete - direct entry
const directClickId = '7ab6b14f-9f5b-440d-8f71-403ab60838a8';

const url1 = `http://localhost:3000/complete?oi_session=${directClickId}`;

console.log('Testing /complete with direct response...');
console.log('URL:', url1);

http.get(url1, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Location:', res.headers['location']);
  
  if (res.headers['location']) {
    console.log('\n✅ Redirect to:', res.headers['location']);
  }
}).on('error', (e) => {
  console.error('Error:', e.message);
});
