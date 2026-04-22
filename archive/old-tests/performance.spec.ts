import { test, expect } from '@playwright/test';

test.describe('Performance & Load Tests', () => {
  test('J6: Entry endpoint p95 latency < 100ms', async ({ page }) => {
    const timings: number[] = [];

    // Run 10 iterations to measure
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      const response = await page.goto('http://localhost:3000/r/TEST_VALID/SUP_VALID/PERFUSER' + Date.now());
      const duration = Date.now() - start;
      timings.push(duration);

      // Should get redirect quickly
      expect(response?.status()).toBe(302);
    }

    // Calculate approximate p95 (95th percentile)
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index];

    expect(p95).toBeLessThan(100);
  });

  test('J7: Callback endpoint p95 latency < 200ms', async ({ page }) => {
    const timings: number[] = [];

    for (let i = 0; i < 10; i++) {
      const session = 'perf_session_' + Date.now() + '_' + i;
      const start = Date.now();
      await page.goto(`http://localhost:3000/api/callback?session=${session}&type=complete`);
      const duration = Date.now() - start;
      timings.push(duration);
    }

    timings.sort((a, b) => a - b);
    const p95 = timings[Math.floor(timings.length * 0.95)];
    expect(p95).toBeLessThan(200);
  });

  test('J8: Full E2E flow completes < 5s', async ({ page }) => {
    const start = Date.now();

    // Direct flow: entry → callback → complete
    await page.goto('http://localhost:3000/r/TEST_VALID/SUP_VALID/FLOWUSER' + Date.now());
    await page.waitForLoadState('networkidle');

    // Simulate callback (in real test, follow through to survey)
    await page.goto('http://localhost:3000/api/callback?session=test-session-flows&type=complete');
    await page.waitForLoadState('networkidle');

    const totalTime = Date.now() - start;
    expect(totalTime).toBeLessThan(5000);
  });

  test('J9: Admin dashboard loads < 2s with many responses', async ({ page }) => {
    // Precondition: many responses in DB (could be seeded)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const start = Date.now();
    await page.goto('/admin/responses');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(2000);
  });

  test('J10: Concurrent entries handled without errors', async ({ page }) => {
    // Use multiple contexts to simulate concurrent users
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const p = page.context().newPage().then(async (newPage) => {
        const response = await newPage.goto(`http://localhost:3000/r/TEST_VALID/SUP_VALID/CONCUR${Date.now()}_${i}`);
        return response?.status();
      });
      promises.push(p);
    }

    const results = await Promise.all(promises);
    // All should return 302 (redirect)
    results.forEach(status => {
      expect(status).toBe(302);
    });
  });
});
