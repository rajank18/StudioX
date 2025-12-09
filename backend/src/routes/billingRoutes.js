const { Router } = require('express');
const { authMiddleware, attachUserId } = require('../middleware/auth');
const billingController = require('../controllers/billingController');

const router = Router();

router.get('/plans', billingController.getPlans);
router.post('/webhook', billingController.stripeWebhook);

router.use(authMiddleware);
router.use(attachUserId);

router.post('/purchase-credits', billingController.purchaseCredits);
router.post('/upgrade-plan', billingController.upgradePlan);
router.get('/history', billingController.getBillingHistory);
router.get('/next-date', billingController.getNextBillingDate);

module.exports = router;
