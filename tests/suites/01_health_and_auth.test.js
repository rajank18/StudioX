const axios = require('axios');

module.exports = async function testHealthAndAuth({ baseUrl, testUser, assert }) {
  console.log('\n  [Suite 1] 🩺 Health & Authentication Checks');

  // Test 1: Public endpoint availability
  await assert('Health check endpoint (/health)', async () => {
    const res = await axios.get(`${baseUrl}/health`, { timeout: 600000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'ok') throw new Error('Health check status is not ok');
  });

  // Test 2: User Bootstrap Endpoint with Clerk Headers
  await assert('User authentication & bootstrap (/api/users/me)', async () => {
    const res = await axios.get(`${baseUrl}/api/users/me`, {
      headers: {
        'X-User-Id': testUser.id,
        'X-User-Email': testUser.email,
      },
      timeout: 600000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.user && !res.data.id && !res.data.email) {
      throw new Error('Response did not contain user data');
    }
  });
};
