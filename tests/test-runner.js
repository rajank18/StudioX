/**
 * ========================================================
 * 🎬 StudioX Master Automated Test Suite
 * ========================================================
 * Runs end-to-end integration and API tests against:
 *  - Live Production (https://studiox-cgp7.onrender.com)
 *  - Or Local Server (http://localhost:3000)
 *
 * Usage:
 *  node tests/test-runner.js
 *  node tests/test-runner.js --url=http://localhost:3000
 *  node tests/test-runner.js --url=https://studiox-cgp7.onrender.com
 * ========================================================
 */

const path = require('path');
const backendNodeModules = path.join(__dirname, '../backend/node_modules');
process.env.NODE_PATH = [process.env.NODE_PATH, backendNodeModules].filter(Boolean).join(path.delimiter);
require('module').Module._initPaths();

if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const { generateTestFixtures } = require('./fixtures/generate-fixtures');

// Parse command line arguments
const args = process.argv.slice(2);
let targetUrl = process.env.API_URL || 'https://studiox-cgp7.onrender.com';

args.forEach((arg) => {
  if (arg.startsWith('--url=')) {
    targetUrl = arg.replace('--url=', '').trim();
  }
});

targetUrl = targetUrl.replace(/\/+$/, '');

const testUser = {
  id: 'test_user_' + Date.now().toString(36),
  email: `tester_${Date.now().toString(36)}@example.com`,
};

// Test results accumulator
const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
};

async function assert(testName, fn) {
  const t0 = Date.now();
  try {
    process.stdout.write(`    ⏳ ${testName}... `);
    await fn();
    const duration = Date.now() - t0;
    process.stdout.write(`\r    ✅ ${testName} (${duration}ms)\n`);
    stats.passed++;
  } catch (err) {
    const duration = Date.now() - t0;
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error';
    process.stdout.write(`\r    ❌ ${testName} (${duration}ms)\n`);
    console.error(`       Error details: ${msg}`);
    stats.failed++;
  }
}

async function runTestSuite() {
  console.log('\n========================================================');
  console.log('🎬 StudioX Complete End-to-End System Test Suite');
  console.log('========================================================');
  console.log(`🎯 Target API URL: ${targetUrl}`);
  console.log(`👤 Test Identity : ${testUser.email} (${testUser.id})`);
  console.log('========================================================\n');

  console.log('📦 Preparing synthetic test media fixtures (sample.mp4, sample.mp3)...');
  const fixtures = await generateTestFixtures();
  console.log('   Test fixtures generated successfully.\n');

  const context = {
    baseUrl: targetUrl,
    testUser,
    fixtures,
    assert,
  };

  try {
    // 1. Health & Auth
    const suite1 = require('./suites/01_health_and_auth.test');
    await suite1(context);

    // 2. Credits & Billing
    const suite2 = require('./suites/02_credits_and_billing.test');
    await suite2(context);

    // 3. Media & FFmpeg Tools
    const suite3 = require('./suites/03_ffmpeg_media_tools.test');
    await suite3(context);

    // 4. YouTube Ingestion
    const suite4 = require('./suites/04_youtube_ingest.test');
    await suite4(context);

    // 5. AI Services
    const suite5 = require('./suites/05_ai_services.test');
    await suite5(context);

    // 6. User Projects
    const suite6 = require('./suites/06_user_projects.test');
    await suite6(context);

  } catch (err) {
    console.error('\n🚨 Critical suite failure:', err.message);
  }

  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(2);

  console.log('\n========================================================');
  console.log('📊 StudioX Test Suite Summary');
  console.log('========================================================');
  console.log(`  Total Tests Run: ${stats.passed + stats.failed}`);
  console.log(`  ✅ Passed       : ${stats.passed}`);
  console.log(`  ❌ Failed       : ${stats.failed}`);
  console.log(`  ⏱️ Total Time   : ${totalTime}s`);
  console.log('========================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL STUDIOX TEST SUITES PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runTestSuite();
