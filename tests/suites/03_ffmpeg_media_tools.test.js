const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { saveServiceOutput } = require('../utils/outputHelper');

module.exports = async function testFFmpegMediaTools({ baseUrl, testUser, fixtures, assert }) {
  console.log('\n  [Suite 3] 🛠️ Media & FFmpeg Processing Tools');

  const authHeaders = {
    'X-User-Id': testUser.id,
    'X-User-Email': testUser.email,
  };

  // 1. Silence Remover
  await assert('Silence Remover tool (/api/remove-silence)', async () => {
    const form = new FormData();
    form.append('audio', fs.createReadStream(fixtures.audioPath));

    const res = await axios.post(`${baseUrl}/api/remove-silence`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      responseType: 'arraybuffer',
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.length === 0) throw new Error('Received empty audio buffer');

    await saveServiceOutput('silence-remover', 'silence_removed.mp3', Buffer.from(res.data));
  });

  // 2. Noise Reduction (Preset mode)
  await assert('Noise Reduction preset mode (/api/noise-reduction/preset)', async () => {
    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));
    form.append('preset', 'balanced');

    const res = await axios.post(`${baseUrl}/api/noise-reduction/preset`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const outUrl = res.data.url || res.data.publicUrl;
    if (!outUrl) throw new Error('Missing output URL');

    await saveServiceOutput('noise-reduction', 'preset_denoised.mp4', outUrl, baseUrl);
  });

  // 3. Noise Reduction (Custom sliders)
  await assert('Noise Reduction custom mode (/api/noise-reduction/custom)', async () => {
    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));
    form.append('noiseReduction', '70');
    form.append('voiceEnhancement', '60');

    const res = await axios.post(`${baseUrl}/api/noise-reduction/custom`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const outUrl = res.data.url || res.data.publicUrl;
    if (!outUrl) throw new Error('Missing output URL');

    await saveServiceOutput('noise-reduction', 'custom_denoised.mp4', outUrl, baseUrl);
  });

  // 4. Video Compressor (Analyze + Process)
  await assert('Video Compressor analyze step (/api/video-compressor/analyze)', async () => {
    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));

    const res = await axios.post(`${baseUrl}/api/video-compressor/analyze`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.uploadId && !res.data.analysis) throw new Error('Missing analysis result');

    await saveServiceOutput('video-compressor', 'analysis.json', res.data);
  });

  // 5. Video Enhancer
  await assert('Video Enhancer (/api/video-enhancement/process)', async () => {
    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));
    form.append('mode', 'light');
    form.append('enableFpsSmooth', 'false');

    const res = await axios.post(`${baseUrl}/api/video-enhancement/process`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.url && !res.data.filename) throw new Error('Missing enhanced output URL');

    await saveServiceOutput('video-enhancer', 'enhanced_video.mp4', res.data.url, baseUrl);
  });

  // 6. Video to GIF
  await assert('Video to GIF converter (/api/video/to-gif)', async () => {
    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));
    form.append('startTime', '0');
    form.append('duration', '1');
    form.append('gifWidth', '320');

    const res = await axios.post(`${baseUrl}/api/video/to-gif`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.url) throw new Error('Missing GIF URL');

    await saveServiceOutput('video-to-gif', 'output.gif', res.data.url, baseUrl);
  });

  // 7. Crop & Resize
  await assert('Crop and Resize engine (/api/crop-resize/process)', async () => {
    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));
    form.append('startTime', '0');
    form.append('endTime', '1');
    form.append('cropX', '0');
    form.append('cropY', '0');
    form.append('cropWidth', '240');
    form.append('cropHeight', '240');

    const res = await axios.post(`${baseUrl}/api/crop-resize/process`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.url) throw new Error('Missing cropped output URL');

    await saveServiceOutput('crop-resize', 'cropped_video.mp4', res.data.url, baseUrl);
  });

  // 8. Thumbnail Generator (Extract frames + Add text)
  let extractedSessionId = null;
  let firstFrameName = null;

  await assert('Thumbnail Generator extract frames (/api/thumbnail/extract)', async () => {
    const form = new FormData();
    form.append('video', fs.createReadStream(fixtures.videoPath));
    form.append('frameCount', '3');

    const res = await axios.post(`${baseUrl}/api/thumbnail/extract`, form, {
      headers: { ...authHeaders, ...form.getHeaders() },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.sessionId || !Array.isArray(res.data.frames) || res.data.frames.length === 0) {
      throw new Error('No frames extracted');
    }
    extractedSessionId = res.data.sessionId;
    firstFrameName = res.data.frames[0].name;

    if (res.data.frames[0].url) {
      await saveServiceOutput('thumbnail-generator', 'extracted_frame_1.jpg', res.data.frames[0].url, baseUrl);
    }
  });

  if (extractedSessionId && firstFrameName) {
    await assert('Thumbnail Generator text styling (/api/thumbnail/add-text)', async () => {
      const res = await axios.post(
        `${baseUrl}/api/thumbnail/add-text`,
        {
          sessionId: extractedSessionId,
          frameName: firstFrameName,
          text: 'STUDIOX TEST',
          fontSize: 32,
          fontFamily: 'Arial',
          textColor: '#FFFFFF',
          position: 'center',
        },
        {
          headers: authHeaders,
          timeout: 600000,
        }
      );
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const thumbUrl = res.data.url || res.data.thumbnail?.url;
      if (!thumbUrl) throw new Error('Missing generated thumbnail URL');

      await saveServiceOutput('thumbnail-generator', 'styled_thumbnail.jpg', thumbUrl, baseUrl);
    });
  }
};

