import { test, expect } from '@playwright/test';

test.describe('Full Platform Lifecycle E2E Test', () => {
    // Increase timeout for production environment stability
    test.setTimeout(120000); 

    const uniqueId = Date.now();
    const testEmail = 'testadmin@opinioninsights.in';
    const testPassword = 'Admin@123';
    const clientName = `E2E_Client_${uniqueId}`;
    const supplierName = `E2E_Supplier_${uniqueId}`;
    const supplierToken = `E2E${uniqueId.toString().slice(-4)}`;
    const vendorSlug = `slug-${uniqueId}`;
    const projectCode = `E2E_PROJ_${uniqueId}`;
    const projectName = `Automated Project ${uniqueId}`;

    test.beforeEach(async ({ page }) => {
        // Step 1: Login
        console.log('Logging in...');
        await page.goto('/login');
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', testPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30000 });
        console.log('Login successful.');
    });

    test('Complete Platform Lifecycle: Client -> Supplier -> Project -> Redirect', async ({ page }) => {
        // Step 2: Create Client
        console.log(`Creating client: ${clientName}`);
        await page.goto('/admin/clients');
        await page.fill('input[placeholder="Client Name (e.g. Acme Corp)"]', clientName);
        await page.click('button:has-text("Add Client")');
        await page.waitForTimeout(2000); 
        await expect(page.locator('ul')).toContainText(clientName, { timeout: 20000 });
        console.log('Client created.');

        // Step 3: Create Supplier (Multi-step form)
        console.log(`Creating supplier: ${supplierName}`);
        await page.goto('/admin/suppliers');
        await page.click('button:has-text("Add New Vendor")');
        
        // Step 1: Identity
        await page.fill('input[placeholder="e.g. Nexus Insights"]', supplierName);
        await page.fill('input[placeholder="e.g. NEXUS / DYN"]', supplierToken);
        await page.fill('input[placeholder="nexus-insights"]', vendorSlug);
        await page.click('button:has-text("Next Step")');

        // Step 2: Macro
        await page.click('button:has-text("Next Step")');

        // Step 3: Params
        await page.click('button:has-text("Next Step")');

        // Step 4: Redirects
        await page.click('button:has-text("Next Step")');

        // Step 5: Landing
        await page.click('button:has-text("Next Step")');

        // Step 6: Review & Save
        await page.click('button:has-text("Deploy Vendor Profile")');
        await page.waitForTimeout(2000);
        await expect(page.locator('body')).toContainText(supplierName, { timeout: 20000 });
        console.log('Supplier created.');

        // Step 4: Create Project
        console.log(`Creating project: ${projectCode}`);
        await page.goto('/admin/projects');
        
        // Select Client
        await page.selectOption('select', { label: clientName });
        
        await page.fill('input[placeholder="e.g. Samsung Galaxy S24 Study"]', projectName);
        await page.fill('input[placeholder="e.g. SAMSUNG_S24_01"]', projectCode);
        await page.fill('input[placeholder="OPGH"]', 'E2E');
        await page.fill('input[type="url"]', 'https://example.com/survey?uid=[UID]');
        
        await page.click('button:has-text("Deploy Enterprise Route")');
        await page.waitForTimeout(3000);
        
        // Verify project appeared in list
        await page.goto('/admin/projects');
        await expect(page.locator('body')).toContainText(projectCode, { timeout: 20000 });
        console.log('Project created.');

        // Step 5: Assign Project to Supplier
        console.log('Linking supplier to project...');
        await page.goto('/admin/suppliers');
        // Find the specific supplier card and click "Assign Project"
        const supplierCard = page.locator(`div:has-text("${supplierName}")`).filter({ has: page.locator('button:has-text("+ Assign Project")') }).first();
        await supplierCard.locator('button:has-text("+ Assign Project")').first().click();
        
        // Select Project in Modal
        await page.waitForSelector('select', { timeout: 10000 });
        const projectOption = await page.locator('option').filter({ hasText: projectCode }).first().innerText();
        await page.selectOption('select', { label: projectOption.trim() });
        await page.fill('input[type="number"]', '100');
        await page.click('button:has-text("Assign & Deploy Link")');
        await page.waitForTimeout(2000);
        console.log('Link assigned.');

        // Step 6: Verify Link Resolution
        const mockUid = `E2E_USER_${uniqueId}`;
        const trackingUrl = `/r/${projectCode}/${supplierToken}/${mockUid}`;
        console.log(`Testing Tracking URL: ${trackingUrl}`);
        
        // Use a new page context to avoid sharing cookies with the admin session during redirect test
        const context = await page.context().browser()!.newContext();
        const testPage = await context.newPage();
        
        // Navigate to tracking URL on the production domain
        const baseURL = 'https://track.opinioninsights.in';
        const response = await testPage.goto(`${baseURL}${trackingUrl}`);
        
        // We expect it to eventually land on example.com with the UID
        await testPage.waitForURL(/example\.com/, { timeout: 30000 });
        const finalUrl = testPage.url();
        console.log(`Final Landed URL: ${finalUrl}`);
        
        expect(finalUrl).toContain('example.com/survey');
        expect(finalUrl).toContain(mockUid);
        await context.close();

        // Step 7: Verify Dashboard Metrics
        console.log('Verifying dashboard metrics...');
        await page.goto('/admin/dashboard');
        // Check if stats are visible (e.g. "Total Redirects")
        await expect(page.locator('body')).toContainText('Total Clicks', { timeout: 20000 });
        
        console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
    });
});
