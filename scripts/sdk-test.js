/**
 * Simple test to debug SDK project creation
 */
const { createClient } = require('@insforge/sdk');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
const INSFORGE_KEY = process.env.INSFORGE_API_KEY;

const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_KEY
});

async function testSimpleInsert() {
  console.log('Testing simple project insert...');
  
  try {
    const result = await insforge.database.from('projects').insert([{
      project_code: 'TEST_SIMPLE_001',
      project_name: 'Test Simple Project',
      base_url: 'https://test.example.com',
      status: 'active'
    }]);
    
    console.log('Insert result:', result);
    
    // Try to fetch it
    const { data, error } = await insforge.database.from('projects').select('*').eq('project_code', 'TEST_SIMPLE_001').single();
    console.log('Fetched data:', data);
    console.log('Fetch error:', error);
    
  } catch (err) {
    console.error('Insert failed:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
  }
}

testSimpleInsert();
