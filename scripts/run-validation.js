#!/usr/bin/env node

/**
 * Validation Runner - Executes all test suites in parallel or sequentially
 * Usage:
 *   node scripts/run-validation.js --unit
 *   node scripts/run-validation.js --integration
 *   node scripts/run-validation.js --e2e
 *   node scripts/run-validation.js --security
 *   node scripts/run-validation.js --all
 */

const { spawn } = require('child_process');

const SUITES = {
  unit: {
    command: 'jest',
    args: ['tests/unit', '--coverage=false'],
    timeout: 120000,
  },
  integration: {
    command: 'jest',
    args: ['tests/integration'],
    timeout: 120000,
  },
  e2e: {
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e'],
    timeout: 300000, // 5 minutes for E2E
  },
  security: {
    command: 'npm',
    args: ['run', 'test:security'],
    timeout: 60000,
  },
};

async function runSuite(name: string, config: any): Promise<{ passed: boolean; exitCode: number; output: string }> {
  console.log(`\n🚀 Starting ${name} suite...`);

  return new Promise((resolve) => {
    const proc = spawn(config.command, config.args, {
      stdio: 'pipe',
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on('close', (code) => {
      resolve({
        passed: code === 0,
        exitCode: code || 0,
        output: stdout + stderr,
      });
    });

    // Timeout
    setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({
        passed: false,
        exitCode: -1,
        output: `TIMEOUT after ${config.timeout}ms`,
      });
    }, config.timeout);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target || !SUITES[target as keyof typeof SUITES] && target !== '--all') {
    console.error(`
Usage: node scripts/run-validation.js [suite|--all]

Suites:
  --unit        Run unit tests (Jest)
  --integration Run integration tests
  --e2e         Run E2E tests (Playwright)
  --security    Run security tests
  --all         Run all suites in parallel

Examples:
  node scripts/run-validation.js --unit
  node scripts/run-validation.js --all
    `);
    process.exit(1);
  }

  const targets = target === '--all' ? Object.keys(SUITES) : [target.replace(/^--/, '')];

  console.log(`\n📋 Running validation suites: ${targets.join(', ')}`);

  const results: Record<string, any> = {};

  if (target === '--all') {
    // Run suites in parallel
    const promises = targets.map(async (suite) => {
      const config = SUITES[suite as keyof typeof SUITES];
      const result = await runSuite(suite, config);
      results[suite] = result;
    });
    await Promise.all(promises);
  } else {
    // Run single suite
    const config = SUITES[targets[0] as keyof typeof SUITES];
    const result = await runSuite(targets[0], config);
    results[targets[0]] = result;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  let allPassed = true;
  for (const [suite, result] of Object.entries(results)) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${suite}`);
    if (!result.passed) allPassed = false;
  }

  console.log('='.repeat(60));

  if (allPassed) {
    console.log('🎉 All validation suites passed!');
    process.exit(0);
  } else {
    console.log('💥 Some suites failed. Review output above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Validation runner crashed:', err);
  process.exit(1);
});
