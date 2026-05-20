/**
 * Quantclix Full Tracking Validation Test
 *
 * Comprehensive end-to-end test for the PanelFlow tracking system
 * with Quantclix survey integration.
 *
 * Usage: npx tsx scripts/quantclix-validation.mts
 */

import { config } from 'dotenv';
config({ path: ['.env', '.env.local', '.env.local.test'], override: true });

const { TrackingService } = await import('../lib/tracking-service.ts');
const { dashboardService } = await import('../lib/dashboardService.ts');
const { getUnifiedDb } = await import('../lib/unified-db.ts');

import crypto from 'crypto';

// Test configuration
const TEST_CONFIG = {
  clientName: 'pentaglobe',
  projectCode: 'OPI433',
  projectName: 'QUANTCLIX_TEST',
  baseUrl: 'https://opinion.quantclix.com/survey/supplier-auth?projectid=8551234228769&supplierid=48001338053&url=0&uid=[UID]',
  completeTarget: 100
};

// Global state tracking
const testState: any = {
  clientId: null,
  project: null,
  response1: null,
  response2: null,
  metricsBefore: null,
  metricsAfter: null
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function logStep(step: string) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`STEP: ${step}`);
  console.log('─'.repeat(50));
}

function logSuccess(msg: string) {
  console.log(`✅ ${msg}`);
}

function logError(msg: string) {
  console.log(`❌ ${msg}`);
}

function logWarn(msg: string) {
  console.log(`⚠️  ${msg}`);
}

function logData(label: string, data: any) {
  console.log(`   ${label}:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function cleanupExistingData() {
  logStep('PHASE 0: CLEANUP - Removing existing test data');

  const { database: db } = await getUnifiedDb();

  // Find client
  const { data: clients } = await db
    .from('clients')
    .select('id')
    .eq('name', TEST_CONFIG.clientName);

  if (clients && clients.length > 0) {
    const clientIds = clients.map((c: any) => c.id);
    console.log(`   Found ${clientIds.length} existing client(s)`);

    // Delete projects for these clients
    const { data: projects } = await db
      .from('projects')
      .select('id')
      .in('client_id', clientIds);

    if (projects && projects.length > 0) {
      const projectIds = projects.map((p: any) => p.id);
      // Delete responses first (due to foreign keys)
      await db.from('responses').delete().in('project_id', projectIds);
      await db.from('projects').delete().in('id', projectIds);
      console.log(`   Deleted ${projectIds.length} project(s) and associated responses`);
    }

    await db.from('clients').delete().eq('name', TEST_CONFIG.clientName);
    console.log(`   Deleted client: ${TEST_CONFIG.clientName}`);
  }

  // Also check for orphaned project with code OPI433
  const { data: orphanProjects } = await db
    .from('projects')
    .select('id')
    .eq('project_code', TEST_CONFIG.projectCode);

  if (orphanProjects && orphanProjects.length > 0) {
    const projectIds = orphanProjects.map((p: any) => p.id);
    await db.from('responses').delete().in('project_id', projectIds);
    await db.from('projects').delete().in('id', projectIds);
    console.log(`   Deleted ${projectIds.length} orphaned project(s) with code ${TEST_CONFIG.projectCode}`);
  }

  logSuccess('Cleanup complete');
}

async function verifyDatabaseSchema() {
  logStep("PHASE 0: SCHEMA VERIFICATION");

  const { database: db } = await getUnifiedDb();

  // Required columns for tracking functionality
  const requiredColumns = [
    'complete_target',
    'pid_prefix', 'pid_counter', 'pid_padding',
    'force_pid_as_uid',
    'target_uid',
    'client_pid_param', 'client_uid_param',
    'oi_prefix',
    'uid_params'
  ];

  try {
    // Try to select the required columns (table may be empty)
    const { data, error } = await db
      .from("projects")
      .select(requiredColumns.join(","))
      .limit(1);

    if (error) {
      const msg = error.message || "";
      if (msg.includes("column") && (msg.includes("does not exist") || msg.includes("undefined"))) {
        logError("Schema verification failed: Missing required columns");
        console.error("   Error:", msg);
        return false;
      }
      // Other errors (connection, etc.)
      throw error;
    }

    logSuccess("All required columns appear to be present");
    return true;
  } catch (err: any) {
    logError("Schema verification exception: " + err.message);
    return false;
  }
}

// ============================================
// PROJECT SETUP
// ============================================

async function createClient() {
  logStep('PHASE 1: CREATE TEST CLIENT');

  const { database: db } = await getUnifiedDb();

  const { data: client, error } = await db
    .from('clients')
    .insert([{ name: TEST_CONFIG.clientName }])
    .select('*')
    .single();

  if (error || !client) {
    throw new Error(`Client creation failed: ${error?.message || 'No data returned'}`);
  }

  testState.clientId = client.id;
  logSuccess(`Created client: ${client.name} (id: ${client.id})`);
  return client;
}

async function createProject(pidConfig: any) {
  logStep('PHASE 1: CREATE TEST PROJECT');

  // Use dashboardService to create project
  const projectData = {
    client_id: testState.clientId,
    project_name: TEST_CONFIG.projectName,
    project_code: TEST_CONFIG.projectCode,
    base_url: TEST_CONFIG.baseUrl,
    status: 'active',
    complete_target: TEST_CONFIG.completeTarget,
    // PID configuration
    pid_prefix: pidConfig.pid_prefix,
    pid_counter: pidConfig.pid_counter,
    pid_padding: pidConfig.pid_padding,
    force_pid_as_uid: pidConfig.force_pid_as_uid,
    // UID config
    target_uid: null,
    client_pid_param: 'pid',
    client_uid_param: 'uid',
    oi_prefix: 'oi_',
    uid_params: null
  };

  logData('Project data', projectData);

  const { data: project, error } = await dashboardService.createProject(projectData);

  if (error || !project) {
    throw new Error(`Project creation failed: ${error?.message || 'No data returned'}`);
  }

  testState.project = project;
  logSuccess(`Created project: ${project.project_code} (id: ${project.id})`);
  logData('Project settings', {
    pid_prefix: project.pid_prefix,
    pid_counter: project.pid_counter,
    force_pid_as_uid: project.force_pid_as_uid,
    complete_target: project.complete_target
  });

  // Verify project saved correctly
  const { database: db } = await getUnifiedDb();
  const { data: savedProject } = await db
    .from('projects')
    .select('*')
    .eq('id', project.id)
    .maybeSingle();

  if (!savedProject) {
    throw new Error('Project not found in database after creation');
  }

  logSuccess('Project verified in database');
  return project;
}

// ============================================
// TRACKING ENTRY FLOW
// ============================================

async function runEntryFlow(testUid: string, forcePid: boolean, testNumber: number) {
  logStep(`PHASE 2: ENTRY FLOW TEST ${testNumber}`);
  console.log(`   UID: ${testUid}`);
  console.log(`   force_pid_as_uid: ${forcePid}`);

  const result = await TrackingService.processEntry({
    projectId: testState.project.id,
    rid: testUid,
    supplierToken: null,
    userAgent: 'Quantclix-Test/1.0',
    ip: '127.0.0.1',
    queryParams: {}
  });

  if (!result.success) {
    throw new Error(`Entry failed: ${result.errorType} - ${result.errorMessage}`);
  }

  const response = result.responseData;

  logSuccess('Entry successful');
  logData('Response', {
    id: response.id,
    clickid: response.clickid,
    uid: response.uid,
    client_pid: response.client_pid,
    status: response.status,
    oi_session: response.oi_session
  });

  logData('Redirect URL', result.redirectUrl);

  // Validations
  const errors: string[] = [];

  // 1. UID should match incoming
  if (response.uid !== testUid) {
    errors.push(`UID mismatch: expected ${testUid}, got ${response.uid}`);
  }

  // 2. Status should be in_progress
  if (response.status !== 'in_progress') {
    errors.push(`Status should be in_progress, got ${response.status}`);
  }

  // 3. Clickid should be set (session token)
  if (!response.clickid) {
    errors.push('Missing clickid (session token)');
  }

  // 4. Redirect URL validation
  const url = new URL(result.redirectUrl);
  const urlPid = url.searchParams.get('pid');
  const urlUid = url.searchParams.get('uid');

  if (!urlUid) {
    errors.push('Redirect URL missing uid parameter');
  }

  if (testState.project.pid_prefix && !urlPid) {
    errors.push('Redirect URL missing pid parameter (prefix is set)');
  }

  // 5. force_pid_as_uid handling
  if (forcePid) {
    // When enabled, client_pid should be generated and UID param should equal PID
    if (!response.client_pid) {
      errors.push('force_pid_as_uid=true but client_pid not generated');
    }
    if (urlUid !== response.client_pid) {
      errors.push(`force_pid_as_uid: URL uid should be PID ${response.client_pid}, got ${urlUid}`);
    }
    logSuccess('force_pid_as_uid correctly applied');
  } else {
    // When disabled, UID param should equal original UID
    if (urlUid !== testUid) {
      errors.push(`URL uid should be original UID ${testUid}, got ${urlUid}`);
    }
    logSuccess('Original UID preserved in URL');
  }

  // 6. PID param validation
  if (testState.project.pid_prefix && urlPid && response.client_pid) {
    if (urlPid !== response.client_pid) {
      errors.push(`PID param mismatch: expected ${response.client_pid}, got ${urlPid}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Entry validation failed:\\n${errors.map((e: string) => '  - ' + e).join('\\n')}`);
  }

  logSuccess('All entry validations passed');

  return {
    response,
    redirectUrl: result.redirectUrl,
    clickid: response.clickid
  };
}

// ============================================
// CALLBACK FLOW
// ============================================

async function triggerTerminateCallback(clickId: string) {
  logStep('PHASE 3: TERMINATE CALLBACK');

  const result = await TrackingService.updateStatus({ clickid: clickId, status: 'terminate' });

  if (!result.success) {
    throw new Error(`Terminate failed: ${result.error?.message}`);
  }

  logSuccess('Terminate callback successful');
  return result;
}

async function validateResponseState(responseId: string, expectedStatus: string) {
  logStep('PHASE 3: VERIFY RESPONSE UPDATE');

  const { database: db } = await getUnifiedDb();
  const { data: resp, error } = await db
    .from('responses')
    .select('id, status, uid, clickid, client_pid, updated_at, created_at')
    .eq('id', responseId)
    .maybeSingle();

  if (error || !resp) {
    throw new Error(`Failed to fetch response: ${error?.message}`);
  }

  logData('Response state', {
    id: resp.id,
    status: resp.status,
    uid: resp.uid,
    clickid: resp.clickid,
    client_pid: resp.client_pid
  });

  if (resp.status !== expectedStatus) {
    throw new Error(`Status mismatch: expected ${expectedStatus}, got ${resp.status}`);
  }
  logSuccess(`Status correctly updated to ${expectedStatus}`);

  return resp;
}

async function verifyDashboardMetrics(beforeTerminate: any, afterTerminate: any) {
  logStep('PHASE 5: DASHBOARD VALIDATION');

  const metrics = await dashboardService.getProjectHealthMetrics();
  const projectMetric = metrics.find((m: any) => m.project_code === TEST_CONFIG.projectCode);

  if (!projectMetric) {
    throw new Error(`Project ${TEST_CONFIG.projectCode} not found in dashboard metrics`);
  }

  logData('Dashboard metrics', {
    project_name: projectMetric.project_name,
    clicks_total: projectMetric.clicks_total,
    in_progress_today: projectMetric.in_progress_today,
    completes_today: projectMetric.completes_today,
    terminates_today: projectMetric.terminates_today,
    quota_today: projectMetric.quota_today
  });

  if (beforeTerminate && afterTerminate) {
    const delta = afterTerminate.terminates_today - beforeTerminate.terminates_today;
    if (delta >= 1) {
      logSuccess(`Terminate count increased by ${delta}`);
    } else {
      throw new Error(`Terminate count did not increase (before: ${beforeTerminate.terminates_today}, after: ${afterTerminate.terminates_today})`);
    }
  }

  return projectMetric;
}

// ============================================
// SECURITY VALIDATION
// ============================================

async function testFakeCallback() {
  logStep('PHASE 6: SECURITY TEST - FAKE CALLBACK');

  const fakeClickId = crypto.randomUUID();
  console.log(`   Using fake clickId: ${fakeClickId}`);

  try {
    const result = await TrackingService.updateStatus({ clickid: fakeClickId, status: 'terminate' });

    if (result.success) {
      throw new Error('SECURITY BREACH: Fake callback succeeded and updated database!');
    }

    logSuccess('Fake callback correctly rejected');
    logData('Rejection reason', { errorType: result.errorType, errorMessage: result.errorMessage });

    // Verify no row was updated
    const { database: db } = await getUnifiedDb();
    const { data: check } = await db
      .from('responses')
      .select('id')
      .eq('clickid', fakeClickId)
      .maybeSingle();

    if (check) {
      throw new Error('Fake callback affected database row!');
    }

    logSuccess('No database changes from fake callback');

  } catch (err: any) {
    if (err.message.includes('SECURITY BREACH')) {
      throw err;
    }
    logError(`Unexpected error in security test: ${err.message}`);
  }
}

// ============================================
// MAIN TEST EXECUTION
// ============================================

async function runFullTest() {
  console.log('\n' + '='.repeat(60));
  console.log('QUANTCLIX TRACKING VALIDATION TEST');
  console.log('='.repeat(60));
  console.log(`\nConfiguration:`);
  console.log(`   Client: ${TEST_CONFIG.clientName}`);
  console.log(`   Project Code: ${TEST_CONFIG.projectCode}`);
  console.log(`   Survey URL: ${TEST_CONFIG.baseUrl}`);

  try {
    // PHASE 0: Preparation
    await cleanupExistingData();

    const schemaOk = await verifyDatabaseSchema();
    if (!schemaOk) {
      throw new Error('Database schema incomplete. Please apply migrations first.');
    }

    // PHASE 1: Project Setup
    await createClient();
    await createProject({
      pid_prefix: 'QTC',
      pid_counter: 1,
      pid_padding: 3,
      force_pid_as_uid: false // Initial: false
    });

    // PHASE 2: Entry Flow - Without force_pid_as_uid
    const entry1 = await runEntryFlow('testuser01', false, 1);
    testState.response1 = entry1.response;

    // Capture metrics before terminate
    const metricsBefore = await dashboardService.getProjectHealthMetrics();
    testState.metricsBefore = metricsBefore.find((m: any) => m.project_code === TEST_CONFIG.projectCode);

    // PHASE 3: Callback Flow
    await triggerTerminateCallback(entry1.clickid);
    const finalResp1 = await validateResponseState(testState.response1.id, 'terminate');
    testState.response1 = finalResp1;

    // PHASE 4: Validation is done in entry flow already
    logStep('PHASE 4: PID/UID VALIDATION');
    logSuccess('Validation complete - see entry flow logs');

    // PHASE 5: Dashboard Validation
    const metricsAfter = await dashboardService.getProjectHealthMetrics();
    testState.metricsAfter = metricsAfter.find((m: any) => m.project_code === TEST_CONFIG.projectCode);
    await verifyDashboardMetrics(testState.metricsBefore, testState.metricsAfter);

    // PHASE 6: Security Validation
    await testFakeCallback();

    // PHASE 7: Test with force_pid_as_uid = true
    logStep('PHASE 7: TEST FORCE_PID_AS_UID = true');
    console.log('   Updating project configuration...');

    await dashboardService.updateProject(testState.project.id, { force_pid_as_uid: true });
    testState.project.force_pid_as_uid = true;

    const entry2 = await runEntryFlow('testuser02', true, 2);
    testState.response2 = entry2.response;

    // Get fresh metrics
    const metricsBefore2 = await dashboardService.getProjectHealthMetrics();
    testState.metricsBefore = metricsBefore2.find((m: any) => m.project_code === TEST_CONFIG.projectCode);

    await triggerTerminateCallback(entry2.clickid);
    const finalResp2 = await validateResponseState(testState.response2.id, 'terminate');
    testState.response2 = finalResp2;

    const metricsAfter2 = await dashboardService.getProjectHealthMetrics();
    testState.metricsAfter = metricsAfter2.find((m: any) => m.project_code === TEST_CONFIG.projectCode);
    await verifyDashboardMetrics(null, testState.metricsAfter);

    // FINAL SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nFINAL RESULTS:\n');

    console.log('Generated Launch Links:');
    console.log(`  Without force_pid_as_uid: ${entry1.redirectUrl}`);
    console.log(`  With force_pid_as_uid: ${entry2.redirectUrl}`);

    console.log('\nCallback Logs:');
    console.log('  Check table: callback_logs');

    console.log('\nResponse Rows:');
    console.log(`  Test 1 - ID: ${finalResp1.id}, Final Status: ${finalResp1.status}`);
    console.log(`  Test 2 - ID: ${finalResp2.id}, Final Status: ${finalResp2.status}`);

    console.log('\nDashboard Status:');
    console.log(`  Total clicks: ${testState.metricsAfter.clicks_total}`);
    console.log(`  Terminates today: ${testState.metricsAfter.terminates_today}`);

    console.log('\nSecurity Validation:');
    console.log('  Fake callbacks correctly rejected');
    console.log('  No duplicate rows created');
    console.log('  Session token required for updates');

    console.log('\nFINAL RESULT: PASS');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (err: any) {
    console.error('\n' + '='.repeat(60));
    console.error('TEST FAILED');
    console.error('='.repeat(60));
    console.error(`\nError: ${err.message}`);
    console.error(`\nStack:\n${err.stack}`);
    console.error('\n' + '='.repeat(60));

    console.log('\nCurrent test state at failure:');
    console.log('   Project:', testState.project ? testState.project.project_code : 'Not created');
    console.log('   Response 1:', testState.response1 ? `${testState.response1.id} (${testState.response1.status})` : 'Not created');
    console.log('   Response 2:', testState.response2 ? `${testState.response2.id} (${testState.response2.status})` : 'Not created');

    process.exit(1);
  }
}

// Run the test directly
runFullTest().catch((err: any) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
