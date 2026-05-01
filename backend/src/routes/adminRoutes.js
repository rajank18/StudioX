const { Router } = require('express');
const { adminLogin, getDashboard } = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/adminAuth');

const router = Router();

router.post('/login', adminLogin);
router.get('/dashboard', requireAdminAuth, getDashboard);

module.exports = router;
