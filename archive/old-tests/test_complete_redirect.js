const http = require('http');

// Complete with supplier session
const oiSession = '4f2eda31-fe9f-4e96-bd8b-79d2d2d5e4bc';
const url = `http://localhost:3000/complete?oi_session=${oiSession}`;

console.log('Testing complete callback:');
console.log('URL:', url);

http.get(url, (res) => {
  console.log('\nStatus:', res.statusCode);
  console.log('Location:', res.headers['location']);
  
  if (res.headers['location']) {
    console.log('\n✅ REDIRECT TO:', res.headers['location']);
  } else {
    console.log('\n❌ NO REDIRECT - Showing PanelFlow page');
  }
}).on('error', e => console.error('Error:', e.message));
