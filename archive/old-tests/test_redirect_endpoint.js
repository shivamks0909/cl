const BASE_URL = 'http://localhost:3000';
const pid = 'TEST_PID_001';
const uid = 'direct_1776728984674';
const clickid = 'a1156ad8-6e19-4d44-b510-7bd90dcfddff';

fetch(`${BASE_URL}/redirect/complete?pid=${pid}&uid=${uid}&clickid=${clickid}`)
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(html => {
    console.log('HTML snippet:', html.substring(0, 500));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
