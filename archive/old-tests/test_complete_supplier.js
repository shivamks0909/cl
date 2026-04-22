const http = require('http');

// Supplier entry
const supplierClickId = '0823e4e3-a018-4952-aa18-53cadd9fc351';

const url = `http://localhost:3000/complete?oi_session=${supplierClickId}`;

console.log('Testing /complete with supplier response...');
console.log('URL:', url);

http.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Location:', res.headers['location']);
  
  if (res.headers['location']?.startsWith('http')) {
    console.log('\n✅ EXTERNAL redirect to supplier page:', res.headers['location']);
  } else if (res.headers['location']) {
    console.log('\n⚠️ Internal redirect:', res.headers['location']);
  } else {
    console.log('\n❌ No redirect - showing PanelFlow page');
  }
}).on('error', (e) => {
  console.error('Error:', e.message);
});
