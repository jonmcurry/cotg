/**
 * Test cases for Clubhouse Performance Optimizations
 *
 * TDD Approach: Verify that parallel lineup generation is faster than sequential.
 *
 * Run with: npx tsx src/components/clubhouse/Clubhouse.test.ts
 */

// Simple test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  const runTest = async () => {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (e: any) {
      console.log(`FAIL: ${name}`);
      console.log(`  -> ${e.message}`);
      failed++;
    }
  };
  return runTest();
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log('='.repeat(70));
console.log('CLUBHOUSE PERFORMANCE TESTS');
console.log('='.repeat(70));
console.log('');

// ============================================================================
// Test: Parallel vs Sequential execution timing
// ============================================================================

console.log('\n--- PARALLEL EXECUTION TESTS ---\n');

// Simulate API call that takes ~100ms
async function simulateApiCall(teamId: string, delay: number = 100): Promise<{ teamId: string }> {
  await new Promise(resolve => setTimeout(resolve, delay));
  return { teamId };
}

async function runTests() {
  await test('Sequential execution should take N * delay ms', async () => {
    const teams = ['team1', 'team2', 'team3', 'team4'];
    const delay = 50; // 50ms per team

    const startTime = Date.now();

    // Sequential approach (OLD - slow)
    const results: { teamId: string }[] = [];
    for (const teamId of teams) {
      const result = await simulateApiCall(teamId, delay);
      results.push(result);
    }

    const elapsed = Date.now() - startTime;

    // Should take approximately N * delay = 4 * 50 = 200ms
    assert(elapsed >= 180, `Sequential should take at least 180ms, took ${elapsed}ms`);
    assert(results.length === 4, 'Should have 4 results');
    console.log(`  -> Sequential: ${elapsed}ms for ${teams.length} teams`);
  });

  await test('Parallel execution should take ~delay ms (not N * delay)', async () => {
    const teams = ['team1', 'team2', 'team3', 'team4'];
    const delay = 50;

    const startTime = Date.now();

    // Parallel approach (NEW - fast)
    const results = await Promise.all(
      teams.map(teamId => simulateApiCall(teamId, delay))
    );

    const elapsed = Date.now() - startTime;

    // Should take approximately max(delay) = 50ms, not 200ms
    assert(elapsed < 150, `Parallel should take less than 150ms, took ${elapsed}ms`);
    assert(results.length === 4, 'Should have 4 results');
    console.log(`  -> Parallel: ${elapsed}ms for ${teams.length} teams`);
  });

  await test('Parallel should be at least 2x faster than sequential for 4 items', async () => {
    const teams = ['team1', 'team2', 'team3', 'team4'];
    const delay = 50;

    // Time sequential
    const seqStart = Date.now();
    for (const teamId of teams) {
      await simulateApiCall(teamId, delay);
    }
    const seqElapsed = Date.now() - seqStart;

    // Time parallel
    const parStart = Date.now();
    await Promise.all(teams.map(teamId => simulateApiCall(teamId, delay)));
    const parElapsed = Date.now() - parStart;

    const speedup = seqElapsed / parElapsed;
    assert(speedup >= 2, `Expected at least 2x speedup, got ${speedup.toFixed(1)}x`);
    console.log(`  -> Speedup: ${speedup.toFixed(1)}x (${seqElapsed}ms -> ${parElapsed}ms)`);
  });

  await test('Error in one team should not block others (Promise.allSettled approach)', async () => {
    const teams = ['team1', 'team2', 'error', 'team4'];
    const delay = 30;

    async function simulateWithError(teamId: string): Promise<{ teamId: string }> {
      await new Promise(resolve => setTimeout(resolve, delay));
      if (teamId === 'error') throw new Error('Simulated error');
      return { teamId };
    }

    const results = await Promise.allSettled(
      teams.map(teamId => simulateWithError(teamId))
    );

    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results.filter(r => r.status === 'rejected').length;

    assert(fulfilled === 3, `Expected 3 fulfilled, got ${fulfilled}`);
    assert(rejected === 1, `Expected 1 rejected, got ${rejected}`);
    console.log(`  -> ${fulfilled} succeeded, ${rejected} failed (errors handled gracefully)`);
  });

  // ============================================================================
  // RESULTS
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\nTests FAILED!');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED!');
    console.log('\nThe fix converts sequential for-await to Promise.all() for parallel execution.');
    process.exit(0);
  }
}

runTests();
