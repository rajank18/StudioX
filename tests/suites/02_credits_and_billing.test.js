const axios = require('axios');

module.exports = async function testCreditsAndBilling({ baseUrl, testUser, assert }) {
  console.log('\n  [Suite 2] 💳 Credit System, Plans & Billing');

  // Test 1: Fetch Available Subscription Plans
  await assert('Get available subscription plans (/api/billing/plans)', async () => {
    const res = await axios.get(`${baseUrl}/api/billing/plans`, { timeout: 15000 });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const plans = res.data.plans || res.data;
    if (!Array.isArray(plans)) throw new Error('Expected plans array');
    console.log(`      Found ${plans.length} subscription plans in DB`);
  });

  // Test 2: User Credit Balance Check
  await assert('Check user current credit status (/api/users/credits)', async () => {
    const res = await axios.get(`${baseUrl}/api/users/credits`, {
      headers: {
        'X-User-Id': testUser.id,
        'X-User-Email': testUser.email,
      },
      timeout: 15000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (typeof res.data.currentCredits === 'undefined' && typeof res.data.credits === 'undefined') {
      throw new Error('Credit count missing from response');
    }
    const credits = res.data.currentCredits ?? res.data.credits;
    console.log(`      User credit balance: ${credits} credits`);
  });

  // Test 3: Billing History
  await assert('Check user billing history (/api/billing/history)', async () => {
    const res = await axios.get(`${baseUrl}/api/billing/history`, {
      headers: {
        'X-User-Id': testUser.id,
        'X-User-Email': testUser.email,
      },
      timeout: 15000,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
};
