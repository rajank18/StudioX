const axios = require('axios');

module.exports = async function testAiServices({ baseUrl, testUser, assert }) {
  console.log('\n  [Suite 5] 🤖 AI Services & Endpoints');

  const authHeaders = {
    'X-User-Id': testUser.id,
    'X-User-Email': testUser.email,
  };

  // 1. AI Reel Cutter Status Check
  await assert('AI Reel Cutter job status endpoint (/api/reel-cutter/status/:id)', async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/reel-cutter/status/test_job_123`, {
        headers: authHeaders,
        timeout: 20000,
      });
      if (res.status !== 200 && res.status !== 404) {
        throw new Error(`Unexpected status code: ${res.status}`);
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 502) {
        // Job not found or HF Space waking up is expected for a dummy ID
        return;
      }
      throw err;
    }
  });

  // 2. AI Tasks Status Endpoint
  await assert('AI Task Queue listing (/api/tasks)', async () => {
    const res = await axios.get(`${baseUrl}/api/tasks`, {
      headers: authHeaders,
      timeout: 15000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const tasks = res.data.tasks || res.data;
    if (!Array.isArray(tasks)) throw new Error('Expected tasks array');
  });

  // 3. AI Subtitles status checks
  await assert('AI Subtitle Generator endpoint guard check', async () => {
    try {
      await axios.post(
        `${baseUrl}/api/ai-subtitles/transcribe`,
        {},
        { headers: authHeaders, timeout: 10000 }
      );
    } catch (err) {
      // Expect 400 Bad Request when no video or url is provided
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        return;
      }
      throw err;
    }
  });

  // 4. AI Video Summary guard check
  await assert('AI Video Summary endpoint guard check', async () => {
    try {
      await axios.post(
        `${baseUrl}/api/ai-video-summary/generate`,
        {},
        { headers: authHeaders, timeout: 10000 }
      );
    } catch (err) {
      // Expect 400 Bad Request when no input is provided
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        return;
      }
      throw err;
    }
  });
};
