const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');

const clerkAuth = ClerkExpressWithAuth();

// Middleware to ensure user exists in database
const ensureUserExists = async (req, res, next) => {
  if (req.auth?.userId) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // Check if user exists, create if not
      const user = await prisma.user.upsert({
        where: { id: req.auth.userId },
        update: {},
        create: {
          id: req.auth.userId,
          email: req.auth.sessionClaims?.email || `user_${req.auth.userId}@example.com`,
          currentCredits: 10000, // Default credits
        },
      });
      
      req.user = user;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }
  next();
};

module.exports = {
  clerkAuth,
  ensureUserExists,
};