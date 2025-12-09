const { Router } = require('express');
const { authMiddleware, attachUserId } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = Router();

router.use(authMiddleware);
router.use(attachUserId);

router.get('/me', userController.getCurrentUser);
router.get('/credits', userController.getUserCredits);
router.get('/transactions', userController.getTransactions);
router.post('/initialize', userController.initializeUser);
router.post('/upgrade-plan', userController.upgradePlan);

module.exports = router;
