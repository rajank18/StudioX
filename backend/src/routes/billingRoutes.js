const { Router } = require('express');
const { clerkAuth, ensureUserExists, setUserIdFromAuth } = require('../middleware/clerkAuth');
const billingController = require('../controllers/billingController');

const router = Router();

router.get('/plans', billingController.getPlans);
router.post('/webhook', billingController.stripeWebhook);

router.use(clerkAuth);
router.use(ensureUserExists);
router.use(setUserIdFromAuth);

router.post('/purchase-credits', billingController.purchaseCredits);
router.post('/upgrade-plan', billingController.upgradePlan);
router.get('/history', billingController.getBillingHistory);
router.get('/next-date', billingController.getNextBillingDate);

module.exports = router;
