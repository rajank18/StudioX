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

const axios = require('axios');
axios.defaults.timeout = 600000; // 10 minutes (600,000ms)

const { generateTestFixtures } = require('./fixtures/generate-fixtures');

// Parse command line arguments
const args = process.argv.slice(2);
let targetUrl = process.env.API_URL || 'https://studiox-cgp7.onrender.com';
let suiteFilter = null;

args.forEach((arg) => {
  if (arg.startsWith('--url=')) {
    targetUrl = arg.replace('--url=', '').trim();
  } else if (arg.startsWith('--suite=')) {
    suiteFilter = arg.replace('--suite=', '').trim().toLowerCase();
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assert(testName, fn, retries = 2) {
  const t0 = Date.now();
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      if (attempt === 1) {
        process.stdout.write(`    ⏳ ${testName}... `);
      } else {
        process.stdout.write(`\r    ⏳ ${testName} (retry ${attempt - 1})... `);
      }
      await fn();
      const duration = Date.now() - t0;
      process.stdout.write(`\r    ✅ ${testName} (${duration}ms)\n`);
      stats.passed++;
      await sleep(800); // Friendly pacing between requests
      return;
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = status === 429 || status === 502 || status === 503 || err.code === 'ECONNRESET';

      if (isRetryable && attempt <= retries) {
        const backoffMs = status === 429 ? 3000 : 2500;
        await sleep(backoffMs);
        continue;
      }

      const duration = Date.now() - t0;
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error';
      process.stdout.write(`\r    ❌ ${testName} (${duration}ms)\n`);
      console.error(`       Error details: ${msg}`);
      stats.failed++;
      await sleep(500);
      return;
    }
  }
}

async function runTestSuite() {
  console.log('\n========================================================');
  console.log('🎬 StudioX Master Automated Test Suite');
  console.log('========================================================');
  console.log(`🎯 Target API URL: ${targetUrl}`);
  console.log(`👤 Test Identity : ${testUser.email} (${testUser.id})`);
  if (suiteFilter) {
    console.log(`🔍 Filtered Suite: ${suiteFilter}`);
  }
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
    const shouldRun = (name, num) => {
      if (!suiteFilter) return true;
      return suiteFilter === name || suiteFilter === String(num) || suiteFilter.includes(name);
    };

    // 1. Health & Auth
    if (shouldRun('health', 1) || shouldRun('auth', 1)) {
      const suite1 = require('./suites/01_health_and_auth.test');
      await suite1(context);
    }

    // 2. Credits & Billing
    if (shouldRun('credits', 2) || shouldRun('billing', 2)) {
      const suite2 = require('./suites/02_credits_and_billing.test');
      await suite2(context);
    }

    // 3. Media & FFmpeg Tools
    if (shouldRun('ffmpeg', 3) || shouldRun('media', 3)) {
      const suite3 = require('./suites/03_ffmpeg_media_tools.test');
      await suite3(context);
    }

    // 4. YouTube Ingestion
    if (shouldRun('youtube', 4)) {
      const suite4 = require('./suites/04_youtube_ingest.test');
      await suite4(context);
    }

    // 5. AI Services
    if (shouldRun('ai', 5)) {
      const suite5 = require('./suites/05_ai_services.test');
      await suite5(context);
    }

    // 6. User Projects
    if (shouldRun('projects', 6) || shouldRun('user', 6)) {
      const suite6 = require('./suites/06_user_projects.test');
      await suite6(context);
    }

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
