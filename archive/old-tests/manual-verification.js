#!/usr/bin/env node

/**
 * Automated manual verification script for source-aware redirects
 * Simulates browser flow: start → tracking → callback → final redirect
 */

const http = require('http');

const BASE = 'http://localhost:3000';

function request(path, followRedirects = true, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (ManualVerification)',
      },
      followRedirect: false, // We handle manually
    };

    const req = http.get(url, options, (res) => {
      const location = res.headers.location;
      const statusCode = res.statusCode;

      // Consume response data to free up socket
      res.resume();

      if (followRedirects && (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) && location && maxRedirects > 0) {
        // Follow redirect
        console.log(`   ↪ Redirect (${statusCode}) → ${location}`);
        request(location, true, maxRedirects - 1).then(resolve).catch(reject);
      } else {
        resolve({
          statusCode,
          headers: res.headers,
          finalUrl: url.toString()
        });
      }
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runVerification() {
  console.log('🚀 Starting Source-Aware Redirect Verification\n');
  console.log('=' .repeat(60));

  // Test 1: Direct Flow
  console.log('\n📋 Test 1: Direct Flow (source = "direct")');
  console.log('URL: /start/TEST_SRC_978510?uid=MANUAL_001');
  try {
    const res = await request('/start/TEST_SRC_978510?uid=MANUAL_001');

    // The tracking service should redirect to the base_url (survey.example.com) because that's external
    // OR if the survey is internal, it would show something else.
    // For our test project, base_url = https://survey.example.com/complete?uid=[UID]
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Location: ${res.headers.location || 'none'}`);
    console.log(`   Final URL: ${res.finalUrl}`);

    // We expect a redirect (307) to the external survey URL
    if (res.statusCode >= 300 && res.statusCode < 400) {
      const loc = res.headers.location;
      if (loc && loc.includes('survey.example.com')) {
        console.log('   ✅ PASS: Redirected to external survey URL (expected)');
      } else if (loc && loc.includes('/paused')) {
        console.log('   ⚠️  WARNING: Redirected to paused page (check project status)');
      } else {
        console.log('   ⚠️  Unexpected location but redirect occurred');
      }
    } else {
      console.log('   ❌ FAIL: Expected a redirect status (3xx)');
    }
  } catch (err) {
    console.error('   ❌ FAIL:', err.message);
  }

  // Test 2: Supplier Flow
  console.log('\n📋 Test 2: Supplier Flow (source = "supplier")');
  console.log('URL: /start/TEST_SRC_978510?supplier=supp_test_src_1776390978514&uid=MANUAL_002');
  try {
    const res = await request('/start/TEST_SRC_978510?supplier=supp_test_src_1776390978514&uid=MANUAL_002');

    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Location: ${res.headers.location || 'none'}`);

    if (res.statusCode >= 300 && res.statusCode < 400) {
      const loc = res.headers.location;
      // Should redirect to the supplier's complete_redirect_url: https://dashboard.example.com/complete?pid={pid}&uid={uid}
      if (loc && loc.includes('dashboard.example.com')) {
        console.log('   ✅ PASS: Redirected to supplier dashboard (expected)');
        // Check if UID and PID are injected
        const url = new URL(loc);
        const hasUid = url.searchParams.has('uid');
        const hasPid = url.searchParams.has('pid');
        if (hasUid && hasPid) {
          console.log(`   ✅ Parameter injection verified: uid=${url.searchParams.get('uid')}, pid=${url.searchParams.get('pid')}`);
        } else {
          console.log('   ⚠️  Missing uid/pid parameters');
        }
      } else {
        console.log('   ⚠️  Unexpected redirect destination');
      }
    } else {
      console.log('   ❌ FAIL: Expected a redirect status');
    }
  } catch (err) {
    console.error('   ❌ FAIL:', err.message);
  }

  // Test 3: Check database for source tracking
  console.log('\n📋 Test 3: Verify source field in database');
  console.log('Note: This requires manual DB query or API. Example:');
  console.log('SQL: SELECT uid, source, created_at FROM responses WHERE project_code = \'TEST_SRC_978510\' ORDER BY created_at DESC LIMIT 2;');
  console.log('Expected: source = "direct" for first entry, source = "supplier" for second entry.');

  // Provide the queries to run
  console.log('\n--- Database Queries to Run ---');
  console.log('In Supabase SQL Editor or via psql:\n');
  console.log(`SELECT id, uid, source, supplier_token, status, created_at
FROM responses
WHERE project_code = 'TEST_SRC_978510'
ORDER BY created_at DESC
LIMIT 5;`);

  // Test 4: Check redirect resolver logic for different scenarios
  console.log('\n📋 Test 4: Redirect Resolution Logic');
  console.log('We cannot directly test the resolver via HTTP without a full flow, but we have unit tests for it.');
  console.log('Run: npx jest tests/redirect/unit/redirect-resolver.test.ts');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification script complete');
  console.log('\n📌 Manual steps remaining:');
  console.log('1. Open the direct link in a browser and go through the survey');
  console.log('2. Check that after completion you land on /redirect/complete (PanelFlow)');
  console.log('3. Open the supplier link and complete');
  console.log('4. Verify you are redirected to the supplier dashboard URL');
  console.log('5. Run the SQL query above to confirm source field values');
  console.log('\n');
}

runVerification().catch(console.error);
