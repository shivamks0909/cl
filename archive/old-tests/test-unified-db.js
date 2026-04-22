// Test unified-db directly
import { getUnifiedDb } from './lib/unified-db.ts';

async function test() {
  console.log('=== Testing Unified DB ===\n');
  
  const { database: db, source } = await getUnifiedDb();
  console.log('Database source:', source);
  
  if (source === 'local') {
    // Test the exact query that should find our test response
    const clickid = '6acb2005-7246-406e-a011-b18538a8314e';
    
    console.log('\n--- Test 1: eq with clickid ---');
    const result1 = await db
      .from('responses')
      .select('id, status, uid, project_code')
      .eq('clickid', clickid)
      .maybeSingle();
    console.log('Result:', result1);
    
    console.log('\n--- Test 2: ilike with clickid ---');
    const result2 = await db
      .from('responses')
      .select('id, status, uid, project_code')
      .ilike('clickid', clickid)
      .maybeSingle();
    console.log('Result:', result2);
  }
}

test();
