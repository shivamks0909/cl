#!/usr/bin/env node

/**
 * Verify Localhost Test Results
 *
 * Checks that the 6 expected responses were created with correct attributes:
 * - 3 direct flows (complete, terminate, quotafull)
 * - 3 supplier flows (complete, terminate, quotafull)
 *
 * Usage: node scripts/verify-test-results.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PROJECT_CODE = 'TEST_PID_LOCAL_001';

async function verify() {
  console.log('🔍 Verifying test results...\n');

  // Fetch all responses for the test project
  const { data: responses, error: err } = await supabase
    .from('responses')
    .select('id, uid, status, source, supplier_id, supplier_name, supplier_token, clickid, created_at')
    .eq('project_code', PROJECT_CODE)
    .order('created_at', { ascending: true });

  if (err) {
    console.error('❌ Query error:', err.message);
    process.exit(1);
  }

  console.log(`Found ${responses?.length || 0} response(s) for project ${PROJECT_CODE}\n`);

  if (!responses || responses.length === 0) {
    console.error('❌ No responses found. Tests may not have run.');
    process.exit(1);
  }

  // Expect 6 responses
  if (responses.length < 6) {
    console.warn(`⚠️  Expected 6 responses but found ${responses.length}. Some tests may have failed or UIDs were duplicated.`);
  }

  // Group by source and status
  const bySource = { direct: [], supplier: [] };
  for (const r of responses) {
    const src = r.source === 'supplier' ? 'supplier' : 'direct';
    bySource[src].push(r);
  }

  console.log('── Direct Flows ─────────────────────────────────');
  for (const r of bySource.direct) {
    console.log(`UID: ${r.uid} | Status: ${r.status} | Source: ${r.source} | Supplier: ${r.supplier_name || 'none'}`);
  }

  console.log('\n── Supplier Flows ────────────────────────────────');
  for (const r of bySource.supplier) {
    console.log(`UID: ${r.uid} | Status: ${r.status} | Source: ${r.source} | Supplier: ${r.supplier_name} (${r.supplier_token})`);
  }

  // Validation checks
  const checks = [];

  // Check we have at least 3 direct with different statuses: complete, terminate, quota_full
  const directStatuses = bySource.direct.map(r => r.status);
  const hasDirectComplete = directStatuses.includes('complete');
  const hasDirectTerminate = directStatuses.includes('terminate');
  const hasDirectQuota = directStatuses.includes('quota_full');
  checks.push({ name: 'Direct: complete', pass: hasDirectComplete });
  checks.push({ name: 'Direct: terminate', pass: hasDirectTerminate });
  checks.push({ name: 'Direct: quota_full', pass: hasDirectQuota });

  // Check direct have no supplier info
  const directSupplierIds = bySource.direct.filter(r => r.supplier_id).length;
  checks.push({ name: 'Direct flows have null supplier', pass: directSupplierIds === 0 });

  // Check supplier flows have supplier_id and token
  const supplierWithIds = bySource.supplier.filter(r => r.supplier_id && r.supplier_token).length;
  checks.push({ name: 'Supplier flows have supplier_id/token', pass: supplierWithIds === bySource.supplier.length });

  // Check supplier statuses
  const supplierStatuses = bySource.supplier.map(r => r.status);
  const hasSupComplete = supplierStatuses.includes('complete');
  const hasSupTerminate = supplierStatuses.includes('terminate');
  const hasSupQuota = supplierStatuses.includes('quota_full');
  checks.push({ name: 'Supplier: complete', pass: hasSupComplete });
  checks.push({ name: 'Supplier: terminate', pass: hasSupTerminate });
  checks.push({ name: 'Supplier: quota_full', pass: hasSupQuota });

  // Check that supplier names are correct
  const supNames = [...new Set(bySource.supplier.map(r => r.supplier_name))];
  checks.push({ name: 'Supplier name set correctly', pass: supNames.length === 1 && supNames[0] === 'TEST_SUPPLIER_MACK' });

  // Check that all have non-null clickid (session token)
  const allHaveClickid = responses.every(r => r.clickid);
  checks.push({ name: 'All have clickid (session)', pass: allHaveClickid });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  let passed = 0, failed = 0;
  for (const c of checks) {
    const icon = c.pass ? '✅' : '❌';
    console.log(`${icon} ${c.name}`);
    if (c.pass) passed++; else failed++;
  }

  console.log('\n───────────────────────────────────────────────────────');
  console.log(`Total: ${passed} passed, ${failed} failed out of ${checks.length} checks`);
  console.log('───────────────────────────────────────────────────────\n');

  if (failed > 0) {
    console.error('❌ Verification failed. Review results above.');
    process.exit(1);
  } else {
    console.log('✅ All verification checks passed!');
    process.exit(0);
  }
}

verify().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
