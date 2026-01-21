const { Router } = require('express');
const userController = require('../controllers/userController');
const { clerkAuth, ensureUserExists, setUserIdFromAuth } = require('../middleware/clerkAuth');

const router = Router();

// Use Clerk auth for all user endpoints
router.use(clerkAuth);
router.use(ensureUserExists);
router.use(setUserIdFromAuth);

router.get('/me', userController.getCurrentUser);
router.get('/credits', userController.getUserCredits);
router.get('/transactions', userController.getTransactions);
router.post('/initialize', userController.initializeUser);
router.post('/upgrade-plan', userController.upgradePlan);

module.exports = router;
