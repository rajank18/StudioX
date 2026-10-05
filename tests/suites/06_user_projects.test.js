const axios = require('axios');

module.exports = async function testUserProjects({ baseUrl, testUser, assert }) {
  console.log('\n  [Suite 6] 📁 User Projects Library & Media Management');

  const authHeaders = {
    'X-User-Id': testUser.id,
    'X-User-Email': testUser.email,
  };

  // 1. Fetch user projects/videos list
  await assert('List user videos and generated outputs (/api/video/user/videos)', async () => {
    const res = await axios.get(`${baseUrl}/api/video/user/videos`, {
      headers: authHeaders,
      timeout: 15000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const videos = res.data.videos || res.data;
    if (!Array.isArray(videos)) throw new Error('Expected videos array');
    console.log(`      User currently has ${videos.length} items in project library`);
  });
};
