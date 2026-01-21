const { ClerkExpressWithAuth, clerkClient } = require('@clerk/clerk-sdk-node');

const clerkAuth = ClerkExpressWithAuth();

// Set req.userId from Clerk auth
const setUserIdFromAuth = (req, res, next) => {
  const headerUserId = req.headers['x-user-id'];
  if (headerUserId && typeof headerUserId === 'string') {
    req.userId = headerUserId;
  }
  next();
};

// Middleware to ensure user exists in database
const ensureUserExists = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  
  if (userId && userEmail) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const { createOrUpdateUser } = require('../services/userService');
      const user = await createOrUpdateUser(userId, userEmail);
      req.user = user;
      req.userId = user.id;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }
  next();
};

module.exports = {
  clerkAuth,
  setUserIdFromAuth,
  ensureUserExists,
};