import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let BASE_URL: string;
const PROJECT_CODE = 'TEST_PID_001';
const SUPPLIER_TOKEN = 'MACK';
let projectId: string;
let supplierId: string;

// Test data for all three actions
const TEST_ACTIONS = [
  { route: 'complete', dbStatus: 'complete', buttonText: 'Complete Survey', vendorLabel: 'mackinsights.com/redirect/complete' },
  { route: 'terminate', dbStatus: 'terminate', buttonText: 'Terminate Survey', vendorLabel: 'mackinsights.com/redirect/terminate' },
  { route: 'quotafull', dbStatus: 'quota_full', buttonText: 'Quota Full', vendorLabel: 'mackinsights.com/redirect/quotafull' }
];

test.describe('Comprehensive Direct vs Supplier Flow Verification', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
  });


  test.beforeAll(async ({ baseURL }) => {
    BASE_URL = baseURL || `http://localhost:3000`;
    console.log(`--- Setting up DB for Dual Flow Verification targeting ${BASE_URL} ---`);
    
    // 1. Ensure Project
    const { data: existProject } = await supabase.from('projects').select('id').eq('project_code', PROJECT_CODE).maybeSingle();
    if (existProject) {
      await supabase.from('projects')
        .update({ project_name: 'TEST_FULL_FLOW', base_url: `${BASE_URL}/test-survey/${PROJECT_CODE}`, status: 'active' })
        .eq('id', existProject.id);
      projectId = existProject.id;
    } else {
       const { data: created, error: insertErr } = await supabase.from('projects').insert([{
         project_code: PROJECT_CODE,
         project_name: 'TEST_FULL_FLOW',
         base_url: `${BASE_URL}/test-survey/${PROJECT_CODE}`,
         status: 'active'
       }]).select('id').single();
       if (insertErr) {
         console.error('Project insert error:', insertErr);
         throw insertErr;
       }
       if (!created) {
         throw new Error('Project insert returned null data without error');
       }
       projectId = created.id;
    }

    // 2. Ensure Supplier
    const { data: existSupplier } = await supabase.from('suppliers').select('id').eq('supplier_token', SUPPLIER_TOKEN).maybeSingle();
    let suppUpdates = {
      name: 'MACKINSIGHTS',
      status: 'active',
      complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
      terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
      quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}'
    };
    if (existSupplier) {
      await supabase.from('suppliers').update(suppUpdates).eq('id', existSupplier.id);
      supplierId = existSupplier.id;
    } else {
      const { data: created } = await supabase.from('suppliers').insert([{
        supplier_token: SUPPLIER_TOKEN,
        ...suppUpdates
      }]).select('id').single();
      supplierId = created!.id;
    }

    // 3. Ensure Link
    await supabase.from('supplier_project_links').upsert([{
      supplier_id: supplierId,
      project_id: projectId,
      quota_allocated: 9999,
      quota_used: 0,
      status: 'active'
    }], { onConflict: 'supplier_id,project_id' });

    console.log('--- DB Setup Completed ---');
  });

  test.afterAll(async () => {
    // Cleanup test data
    await supabase.from('responses').delete().like('uid', 'dir_test_%');
    await supabase.from('responses').delete().like('uid', 'ven_test_%');
    console.log('--- Test cleanup completed ---');
  });

  // Helper function to verify database entry
  const verifyDatabaseEntry = async (uid: string, expectedStatus: string, expectedSource: 'direct' | 'supplier', expectedSupplierName: string | null = null) => {
    const { data: resp } = await supabase
      .from('responses')
      .select('status, source, supplier_name')
      .eq('uid', uid)
      .eq('project_code', PROJECT_CODE)
      .single();

    expect(resp).toBeTruthy();
    expect(resp?.status).toBe(expectedStatus);
    expect(resp?.source).toBe(expectedSource);
    expect(resp?.supplier_name).toBe(expectedSupplierName);
  };

  // Test Direct Flow for all actions
  TEST_ACTIONS.forEach(({ route, dbStatus, buttonText, vendorLabel }) => {
    test(`Direct Flow: ${buttonText} → Internal Landing Page and logs to Dashboard`, async ({ page }) => {
      const runUid = `dir_test_${Date.now()}_${route}`;
      const url = `${BASE_URL}/test-survey/${PROJECT_CODE}?uid=${runUid}`;

      // Attempt Direct Flow Entry
      await page.goto(url);

      // Wait for session to initialize correctly 
      await expect(page.locator('text=Initializing')).toBeHidden({ timeout: 10000 });

      // Should see exactly these buttons
      await expect(page.locator('text=Test Survey').first()).toBeVisible();
      await expect(page.locator(`text=${runUid}`).first()).toBeVisible();
      await expect(page.locator('text=Source')).toBeVisible();
      await expect(page.locator('text=Direct').first()).toBeVisible();

      const actionBtn = page.locator(`button:has-text("${buttonText}")`);
      await expect(actionBtn).toBeVisible();
      await expect(page.locator(`button:has-text("Complete Survey")`)).toBeVisible();
      await expect(page.locator(`button:has-text("Terminate Survey")`)).toBeVisible();
      await expect(page.locator(`button:has-text("Quota Full")`)).toBeVisible();

      // Click the action button
      await actionBtn.click();

      // Should redirect to internal landing page (WavyOutcomeView)
      await page.waitForURL(`**/redirect/${route}`);
      
      // For direct flow, it should render the internal WavyOutcomeView (not external redirect)
      await expect(page.locator('text=PanelFlow')).toBeVisible({ timeout: 5000 });
      await expect(page.locator(`text=${buttonText.split(' ')[0]}`)).toBeVisible(); // Complete, Terminate, or Quota
      
      // Verify it's NOT an external redirect
      const currentUrl = page.url();
      expect(currentUrl).toContain(BASE_URL); // Should still be on localhost
      expect(currentUrl).not.toContain('mackinsights.com'); // Should NOT go to vendor

      // Verification in Database (Dashboard)
      await verifyDatabaseEntry(runUid, dbStatus, 'direct', null);
    });
  });

  // Test Supplier Flow for all actions
  TEST_ACTIONS.forEach(({ route, dbStatus, buttonText, vendorLabel }) => {
    test(`Supplier Flow: ${buttonText} → External Vendor Landing and logs to Dashboard`, async ({ page }) => {
      const runUid = `ven_test_${Date.now()}_${route}`;
      // Supplier routing standard path
      const url = `${BASE_URL}/r/${PROJECT_CODE}/${SUPPLIER_TOKEN}/${runUid}`;

      await page.goto(url);

      // It should hit Tracking Entry logic and successfully redirect to the Test Survey Page
      await page.waitForURL(`**/test-survey/**`);

      // Wait for page render validation
      await expect(page.locator('text=Initializing')).toBeHidden({ timeout: 10000 });

      // Check parameters loaded accurately 
      await expect(page.locator('text=Test Survey').first()).toBeVisible();
      await expect(page.locator(`text=${runUid}`).first()).toBeVisible();

      // Verify Supplier Source indicator is visible
      await expect(page.locator('text=Supplier — MACKINSIGHTS').first()).toBeVisible();
      await expect(page.locator('text=SUPPLIER').first()).toBeVisible();

      const actionBtn = page.locator(`button:has-text("${buttonText}")`);
      await actionBtn.click();

      // The system should recognize it is a supplier session and automatically 
      // bounce the user externally to dashboard.mackinsights.com
      await page.waitForTimeout(3000); // Wait for redirect chain out
      const currentUrl = page.url();

      expect(currentUrl).toContain('dashboard.mackinsights.com/redirect/' + route);
      expect(currentUrl).toContain(runUid);
      expect(currentUrl).toContain(PROJECT_CODE);

      // Verification in Database (Dashboard)
      await verifyDatabaseEntry(runUid, dbStatus, 'supplier', 'MACKINSIGHTS');
    });
  });

  // Additional test: Verify that accessing via direct link vs vendor link shows same survey but different behavior
  test('Same survey page shows different source badges for direct vs supplier entry', async ({ page }) => {
    const directUid = `direct_source_test_${Date.now()}`;
    const supplierUid = `supplier_source_test_${Date.now()}`;

    // Test Direct Entry
    await page.goto(`${BASE_URL}/test-survey/${PROJECT_CODE}?uid=${directUid}`);
    await expect(page.locator('text=Initializing')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('text=Direct').first()).toBeVisible();
    await expect(page.locator('text=Supplier')).not.toBeVisible();

    // Test Supplier Entry
    await page.goto(`${BASE_URL}/r/${PROJECT_CODE}/${SUPPLIER_TOKEN}/${supplierUid}`);
    await page.waitForURL(`**/test-survey/**`);
    await expect(page.locator('text=Initializing')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('text=Supplier — MACKINSIGHTS').first()).toBeVisible();
    await expect(page.locator('text=SUPPLIER').first()).toBeVisible();
    await expect(page.locator('text=Direct')).not.toBeVisible();
  });

});
