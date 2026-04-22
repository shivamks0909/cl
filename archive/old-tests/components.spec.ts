import { test, expect } from '@playwright/test';

test.describe('UI Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin to access dashboard
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('H1: Dashboard KPI cards display correct counts', async ({ page }) => {
    // Navigate to dashboard home
    await page.goto('/admin');

    // KPI cards should show counts matching database
    // We can verify by checking at least one card displays a number
    const kpiCards = page.locator('.kpi-card .value');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThan(0);

    // Each card should have numeric content
    for (let i = 0; i < count; i++) {
      const text = await kpiCards.nth(i).textContent();
      expect(text).toMatch(/\d+/);
    }
  });

  test('H2: Project form validation', async ({ page }) => {
    await page.goto('/admin/projects/new');

    // Try submit empty
    await page.click('button[type="submit"]');
    await expect(page).toContainText('Required'); // validation errors

    // Fill invalid URL
    await page.fill('input[name="base_url"]', 'not-a-valid-url');
    await page.click('button[type="submit"]');
    await expect(page).toContainText('Invalid URL');

    // Fill valid data
    await page.fill('input[name="project_code"]', 'UI_TEST_001');
    await page.fill('input[name="project_name"]', 'UI Test Project');
    await page.fill('input[name="base_url"]', 'https://survey.example.com/test');
    await page.click('button[type="submit"]');

    // Should redirect to project list with success message
    await expect(page).toHaveURL(/\/admin\/projects/);
    await expect(page).toContainText('Project created');
  });

  test('H3: Supplier form validation', async ({ page }) => {
    await page.goto('/admin/suppliers/new');

    // Invalid email
    await page.fill('input[name="contact_email"]', 'not-an-email');
    await page.click('button[type="submit"]');
    await expect(page).toContainText('Invalid email');

    // Negative quota
    await page.fill('input[name="quota_allocated"]', '-5');
    await page.click('button[type="submit"]');
    await expect(page).toContainText('Must be positive'); // or coerced to 0

    // Valid data
    await page.fill('input[name="name"]', 'UI Test Supplier');
    await page.fill('input[name="supplier_token"]', 'UI_TEST_SUP');
    await page.fill('input[name="complete_redirect_url"]', 'https://supplier.example.com/complete');
    await page.fill('input[name="quota_allocated"]', '100');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin\/suppliers/);
    await expect(page).toContainText('Supplier created');
  });

  test('H4: Link generator produces correct URLs', async ({ page }) => {
    await page.goto('/admin/links/generate');

    // Select project and supplier from dropdowns
    await page.selectOption('select[name="project_code"]', 'TEST_VALID');
    await page.selectOption('select[name="supplier_token"]', 'SUP_VALID');
    await page.fill('input[name="uid"]', 'TESTUID123');

    await page.click('button[text="Generate Link"]');

    // URL should appear in output
    const url = await page.locator('#generated-url').inputValue();
    expect(url).toMatch(/\/r\/TEST_VALID\/SUP_VALID\/TESTUID123/);
  });

  test('H5: Responsive layout on mobile/tablet/desktop', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin');
    // No horizontal scroll
    const horizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(horizontalScroll).toBe(false);

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    const tabletLayout = await page.locator('.admin-layout').isVisible();
    expect(tabletLayout).toBe(true);

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});
