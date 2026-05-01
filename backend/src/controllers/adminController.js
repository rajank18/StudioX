const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { ADMIN_EMAIL, TOKEN_TTL_MS, verifyAdminCredentials, createAdminToken } = require('../utils/adminAuth');
const { getAdminDashboardData } = require('../services/adminService');

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new AppError(400, 'email and password are required');
  }

  const valid = verifyAdminCredentials(email, password);
  if (!valid) {
    throw new AppError(401, 'Invalid admin credentials');
  }

  const token = createAdminToken(email);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  res.status(200).json({
    success: true,
    token,
    tokenType: 'Bearer',
    expiresAt,
    admin: {
      email: ADMIN_EMAIL,
    },
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 100);
  const dashboard = await getAdminDashboardData(limit);

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

module.exports = {
  adminLogin,
  getDashboard,
};
