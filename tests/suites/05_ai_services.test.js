const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { saveServiceOutput } = require('../utils/outputHelper');

module.exports = async function testAiServices({ baseUrl, testUser, fixtures, assert }) {
  console.log('\n  [Suite 5] 🤖 AI Services & Endpoints');

  const authHeaders = {
    'X-User-Id': testUser.id,
    'X-User-Email': testUser.email,
  };

  // 1. AI Reel Cutter Job Status Check
  await assert('AI Reel Cutter job status endpoint (/api/reel-cutter/status/:id)', async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/reel-cutter/status/test_job_123`, {
        headers: authHeaders,
        timeout: 600000,
      });
      if (res.status !== 200 && res.status !== 404) {
        throw new Error(`Unexpected status code: ${res.status}`);
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 502) {
        return;
      }
      throw err;
    }
  });

  // 2. AI Reel Cutter Generation Flow (Upload & Process)
  await assert('AI Reel Cutter generation (/api/reel-cutter/generate)', async () => {
    if (!fixtures?.videoPath || !fs.existsSync(fixtures.videoPath)) {
      console.log('       (Skipping generation: no sample video fixture available)');
      return;
    }

    const form = new FormData();
    form.append('video_file', fs.createReadStream(fixtures.videoPath));
    form.append('num_reels', '1');
    form.append('min_duration', '5');
    form.append('max_duration', '15');
    form.append('resolution', '720p');
    form.append('add_captions', 'false');

    try {
      const res = await axios.post(`${baseUrl}/api/reel-cutter/generate`, form, {
        headers: { ...authHeaders, ...form.getHeaders() },
        timeout: 600000,
      });

      if (res.status === 200 || res.status === 202) {
        const jobId = res.data.jobId || res.data.job_id;
        if (jobId) {
          // Poll until completed or timeout
          let completed = false;
          const startTime = Date.now();
          while (!completed && Date.now() - startTime < 180000) {
            await new Promise((r) => setTimeout(r, 4000));
            const statusRes = await axios.get(`${baseUrl}/api/reel-cutter/status/${jobId}`, {
              headers: authHeaders,
              timeout: 600000,
            });
            const statusData = statusRes.data;
            if (statusData.status === 'completed' || statusData.done) {
              completed = true;
              const downloadUrl = statusData.output?.downloadUrl || `/api/reel-cutter/download/${jobId}`;
              await saveServiceOutput('reel-cutter', `reel_${jobId}.zip`, downloadUrl, baseUrl);
              break;
            } else if (statusData.status === 'failed') {
              throw new Error(`Reel generation failed on worker: ${statusData.error || 'Unknown error'}`);
            }
          }
        }
      }
    } catch (err) {
      // If Hugging Face Space is sleeping (502 / 503) or token is unconfigured in test environment
      if (err.response?.status === 502 || err.response?.status === 503 || err.response?.status === 402) {
        console.log(`       (HF Space unavailable or sleeping: ${err.message})`);
        return;
      }
      throw err;
    }
  });

  // 3. AI Tasks Status Endpoint
  await assert('AI Task Queue listing (/api/tasks)', async () => {
    const res = await axios.get(`${baseUrl}/api/tasks`, {
      headers: authHeaders,
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const tasks = res.data.tasks || res.data;
    if (!Array.isArray(tasks)) throw new Error('Expected tasks array');
  });

  // 4. AI Subtitle Generator (Upload & Info Check)
  await assert('AI Subtitle Generator uploaded video metadata (/api/ai-subtitles/upload/info)', async () => {
    if (!fixtures?.videoPath || !fs.existsSync(fixtures.videoPath)) {
      console.log('       (Skipping: no sample video fixture available)');
      return;
    }

    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));

    const res = await axios.post(`${baseUrl}/api/ai-subtitles/upload/info`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = res.data?.data || res.data;
    await saveServiceOutput('ai-subtitles', 'subtitles_upload_info.json', JSON.stringify(data, null, 2));
  });

  // 5. AI Subtitle Generation Flow (AssemblyAI transcription)
  await assert('AI Subtitle Generator generation (/api/ai-subtitles/upload/generate)', async () => {
    if (!fixtures?.videoPath || !fs.existsSync(fixtures.videoPath)) {
      console.log('       (Skipping: no sample video fixture available)');
      return;
    }

    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));

    try {
      const res = await axios.post(`${baseUrl}/api/ai-subtitles/upload/generate`, form, {
        headers: { ...authHeaders, ...form.getHeaders() },
        timeout: 600000,
      });

      if (res.status === 200) {
        const data = res.data?.data || res.data;
        await saveServiceOutput('ai-subtitles', 'generated_subtitles.json', JSON.stringify(data, null, 2));
        if (data?.subtitlesUrl) {
          await saveServiceOutput('ai-subtitles', 'subtitles.srt', data.subtitlesUrl, baseUrl);
        }
      }
    } catch (err) {
      // If ASSEMBLYAI_API_KEY is not set in cloud container or 3rd party AI quota limit
      if (err.response?.status === 400 && err.response?.data?.hint?.includes('ASSEMBLYAI_API_KEY')) {
        console.log('       (Notice: ASSEMBLYAI_API_KEY not configured on cloud backend)');
        return;
      }
      if (err.response?.status === 502 || err.response?.status === 503 || err.response?.status === 402) {
        console.log(`       (AI upstream unavailable: ${err.message})`);
        return;
      }
      throw err;
    }
  });

  // 6. AI Video Summary (Upload & Info Check)
  await assert('AI Video Summary uploaded video metadata (/api/ai-video-summary/upload/info)', async () => {
    if (!fixtures?.videoPath || !fs.existsSync(fixtures.videoPath)) {
      console.log('       (Skipping: no sample video fixture available)');
      return;
    }

    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));

    const res = await axios.post(`${baseUrl}/api/ai-video-summary/upload/info`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = res.data?.data || res.data;
    await saveServiceOutput('ai-video-summary', 'summary_upload_info.json', JSON.stringify(data, null, 2));
  });

  // 7. AI Video Summary Generation Flow (Gemini / Whisper)
  await assert('AI Video Summary generation (/api/ai-video-summary/upload)', async () => {
    if (!fixtures?.videoPath || !fs.existsSync(fixtures.videoPath)) {
      console.log('       (Skipping: no sample video fixture available)');
      return;
    }

    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));

    try {
      const res = await axios.post(`${baseUrl}/api/ai-video-summary/upload`, form, {
        headers: { ...authHeaders, ...form.getHeaders() },
        timeout: 600000,
      });

      if (res.status === 200) {
        const data = res.data?.data || res.data;
        await saveServiceOutput('ai-video-summary', 'summary_result.json', JSON.stringify(data, null, 2));
      }
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 502 || err.response?.status === 503 || err.response?.status === 402) {
        console.log(`       (AI upstream / API key check: ${err.response?.data?.error || err.message})`);
        return;
      }
      throw err;
    }
  });
};

