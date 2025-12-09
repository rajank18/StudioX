const { Router } = require('express');
const { authMiddleware, attachUserId } = require('../middleware/auth');
const aiTaskController = require('../controllers/aiTaskController');

const router = Router();

router.use(authMiddleware);
router.use(attachUserId);

router.post('/create', aiTaskController.createTask);
router.get('/stats', aiTaskController.getTaskStats);
router.get('/', aiTaskController.getUserTasks);
router.get('/:id', aiTaskController.getTask);
router.patch('/:id/cancel', aiTaskController.cancelTask);
router.patch('/:id/status', aiTaskController.updateTaskStatus);

module.exports = router;
