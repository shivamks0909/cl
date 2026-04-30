import { test as base } from '@playwright/test';

// Helper to perform login
export async function login(page, email = 'admin@opinioninsights.com', password = 'admin123') {
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/dashboard');
}

// Extend test with helper methods
export const test = base.extend<{
  // any fixtures
}>({
  // fixtures can be added here
});
