const http = require('http');

// Complete with supplier session exactly from user
const oiSession = 'bb93186d-ae93-4377-90f7-6c3054fc8638';
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
