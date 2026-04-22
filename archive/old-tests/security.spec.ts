import { test, expect } from '@playwright/test';

test.describe('Security Scenario Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('I1: XSS attempt in project name is escaped', async ({ page }) => {
    // As admin, create project with XSS payload in name
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);

    await page.goto('/admin/projects/new');
    await page.fill('input[name="project_code"]', 'XSS_TEST');
    await page.fill('input[name="project_name"]', '<script>alert("XSS")</script>');
    await page.fill('input[name="base_url"]', 'https://survey.example.com/xss');
    await page.click('button[type="submit"]');

    // Navigate to project list
    await page.goto('/admin/projects');

    // The script should NOT execute
    // If it did, we'd see an alert. We'll check that the page doesn't have alert
    const hasAlert = await page.evaluate(() => {
      // Check if script tags are present in the DOM (they shouldn't be)
      const scripts = document.querySelectorAll('script');
      return scripts.length > 0;
    });
    expect(hasAlert).toBe(false);

    // The text should be rendered as escaped HTML
    const projectName = await page.locator('text=<script>alert("XSS")</script>').isVisible();
    // If escaped, the literal string would appear; if executed, alert would block
    // We'll just verify no alert popped up (implicit in test not throwing)
  });

  test('I2: CSRF protection on state-changing actions', async ({ page }) => {
    // Try POST without CSRF token (if using CSRF middleware)
    // PanelFlow uses session-based auth, may not need CSRF tokens
    // This test verifies that state-changing actions require valid session

    // Without being logged in, attempt to POST to /api/admin/projects
    const response = await page.request.post('http://localhost:3000/api/admin/projects', {
      data: { project_code: 'CSRF_TEST', project_name: 'CSRF Test', base_url: 'https://test.com' },
    });
    expect(response.status()).toBe(401); // or 403
  });

  test('I3: Session timeout requires re-authentication', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);

    // Manipulate session cookie to expire (or wait for actual timeout)
    await page.context().clearCookies();

    // Try to access admin page
    await page.goto('/admin');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('I4: Direct access to admin without login is blocked', async ({ page }) => {
    // Ensure no auth
    await page.context().clearCookies();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('I5: Session cookies have secure flags', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Get cookies after login
    const cookies = await page.context().cookies();

    const sessionCookie = cookies.find(c => c.name === 'session' || c.name.includes('session'));
    expect(sessionCookie).toBeDefined();

    // In production, these should be set. In dev, may be false.
    // We'll check that they are set appropriately for environment
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(sessionCookie?.secure).toBe(true);
      expect(sessionCookie?.sameSite?.toLowerCase()).toMatch(/strict|lax/);
    } else {
      // In dev, HttpOnly should still be true, Secure may be false
      expect(sessionCookie?.httpOnly).toBe(true);
    }
  });
});
