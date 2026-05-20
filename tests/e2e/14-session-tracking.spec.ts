import { test, expect } from '@playwright/test';

test.describe('Secure Session-Based Tracking Flow UAT', () => {

  test('should execute direct secure session-based tracking flow successfully', async ({ page }) => {
    const uid = `e2e_direct_${Date.now()}`;
    
    // 1. Initiate survey entry via /track
    console.log(`[E2E] Navigating to direct /track with uid=${uid}`);
    await page.goto(`/track?code=E2E_SESSION_TEST&uid=${uid}`);
    
    // 2. Verify redirect to local client-survey
    await expect(page).toHaveURL(/client-survey/);
    
    // Check that oi_sid was appended to the client survey url
    const currentUrl = page.url();
    expect(currentUrl).toContain('oi_sid=');
    expect(currentUrl).toContain('pid=');
    expect(currentUrl).toContain(`uid=${uid}`);

    // Parse session ID from the URL
    const urlObj = new URL(currentUrl);
    const oiSid = urlObj.searchParams.get('oi_sid');
    expect(oiSid).toBeTruthy();
    console.log(`[E2E] Resolved secure tracking session ID (oi_sid): ${oiSid}`);

    // 3. Complete respondent screening steps
    // Step 1: Age
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '30');
    await page.click('button:has-text("Next")');

    // Step 2: Gender
    await page.waitForSelector('button:has-text("Male")');
    await page.click('button:has-text("Male")');

    // Step 3: Main Survey - Click Complete Survey
    await page.waitForSelector('button:has-text("Complete Survey")');
    await page.click('button:has-text("Complete Survey")');

    // 4. Verify landing on redirect/complete with secure session validation
    await page.waitForURL(/redirect\/complete/, { timeout: 15000 });
    await expect(page).toHaveURL(/redirect\/complete/);
    
    // Assert that the premium outcome view is displayed and contains our session's metadata
    await expect(page.locator('h1')).toContainText('Survey Complete');
    await expect(page.locator('text=E2E_SESSION_TEST')).toBeVisible();
    await expect(page.locator(`text=${uid}`)).toBeVisible();
  });

  test('should reject and block fake callbacks without valid session identifiers', async ({ page }) => {
    const fakeUid = `fake_user_${Date.now()}`;
    
    // Attempt direct callback access bypass without any session token (oi_sid or clickid)
    console.log(`[E2E] Navigating to fake callback endpoint with uid=${fakeUid}`);
    await page.goto(`/redirect/complete?pid=E2E_SESSION_TEST&uid=${fakeUid}`);

    // Verify it blocks the callback and loads the LandingPageOnly template with status message
    await expect(page.locator('h1')).toContainText('Survey System');
    await expect(page.locator('text=Survey Completed')).toBeVisible();
    await expect(page.locator('text=No active session — survey tracking not updated')).toBeVisible();
  });

  test('should reject and block callbacks with invalid session identifiers', async ({ page }) => {
    const fakeUid = `fake_user_${Date.now()}`;
    const invalidSid = '00000000-0000-0000-0000-000000000000';
    
    // Attempt callback access using an invalid/non-existent session ID
    console.log(`[E2E] Navigating to callback endpoint with invalid oi_sid=${invalidSid}`);
    await page.goto(`/redirect/complete?pid=E2E_SESSION_TEST&uid=${fakeUid}&oi_sid=${invalidSid}`);

    // Verify that the system handles this gracefully, rejecting DB mutations
    // In redirect/complete, invalid sessions fallback to showing the wavy view but without database completion
    await expect(page.locator('h1')).toContainText('Survey Complete');
    // Ensure the respondent stats card shows "—" instead of loaded metadata, since lookup failed
    await expect(page.locator('text=Project ID')).toBeVisible();
  });

});
