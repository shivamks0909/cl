const { getDb } = require('./lib/db');

const db = getDb();
const projects = db.prepare(`
  SELECT id, project_code, project_name, base_url, source, status 
  FROM projects 
  LIMIT 10
`).all();

console.log('Existing Projects:');
console.log(JSON.stringify(projects, null, 2));

const suppliers = db.prepare(`
  SELECT id, name, supplier_token, status 
  FROM suppliers 
  LIMIT 10
`).all();

console.log('\nExisting Suppliers:');
console.log(JSON.stringify(suppliers, null, 2));
