const baseUrl = 'http://localhost:3000';
const projectCode = 'TEST_SRC_260036';
const supplierToken = 'TEST_SRC_262304';

// Test with supplier TOKEN (not ID)
const supplierLink = `${baseUrl}/start/${projectCode}?supplier=${supplierToken}`;

console.log('📋 Correct Test Links:');
console.log('Direct Link:', `${baseUrl}/start/${projectCode}`);
console.log('Supplier Link:', supplierLink);
console.log('\n⚠️ Use supplier TOKEN, not ID!');
