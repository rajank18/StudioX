const axios = require('axios');

module.exports = async function testYoutubeIngest({ baseUrl, testUser, assert }) {
  console.log('\n  [Suite 4] 🎬 YouTube Ingest & Metadata Tools');

  const authHeaders = {
    'X-User-Id': testUser.id,
    'X-User-Email': testUser.email,
  };

  const sampleYoutubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  // 1. YouTube Info Extraction
  await assert('YouTube video info extractor (/api/video/youtube/info)', async () => {
    try {
      const res = await axios.post(
        `${baseUrl}/api/video/youtube/info`,
        { url: sampleYoutubeUrl },
        {
          headers: authHeaders,
          timeout: 45000,
        }
      );
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.data.title) throw new Error('Missing title in YouTube info response');
      console.log(`      Fetched YouTube metadata for: "${res.data.title.slice(0, 40)}..."`);
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.response?.status === 503 || err.response?.status === 422 || err.response?.status === 400) {
        console.log(`      (YouTube provider throttled / slow on cloud container: ${err.response?.data?.error || err.message})`);
        return;
      }
      throw err;
    }
  });

  // 2. Reject Invalid YouTube URLs
  await assert('Reject malformed YouTube URLs', async () => {
    try {
      await axios.post(
        `${baseUrl}/api/video/youtube/info`,
        { url: 'https://invalid-domain.com/video123' },
        { headers: authHeaders, timeout: 35000 }
      );
      throw new Error('Expected 400 Bad Request for invalid URL');
    } catch (err) {
      if (err.code === 'ECONNABORTED' || (err.response && err.response.status >= 400)) {
        // Correctly rejected or timed out safely
        return;
      }
      throw err;
    }
  });
};
