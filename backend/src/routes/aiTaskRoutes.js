const { Router } = require('express');
const { clerkAuth, ensureUserExists, setUserIdFromAuth } = require('../middleware/clerkAuth');
const aiTaskController = require('../controllers/aiTaskController');

const router = Router();

router.use(clerkAuth);
router.use(ensureUserExists);
router.use(setUserIdFromAuth);

router.post('/create', aiTaskController.createTask);
router.get('/stats', aiTaskController.getTaskStats);
router.get('/', aiTaskController.getUserTasks);
router.get('/:id', aiTaskController.getTask);
router.patch('/:id/cancel', aiTaskController.cancelTask);
router.patch('/:id/status', aiTaskController.updateTaskStatus);

module.exports = router;
