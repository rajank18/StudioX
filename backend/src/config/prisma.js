const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const buildClient = (url) => {
  if (url) {
    return new PrismaClient({
      datasources: {
        db: { url },
      },
    });
  }

  return new PrismaClient();
};

let activeDatabaseUrl = process.env.DATABASE_URL;
let prismaClient = globalForPrisma.__studioxPrismaClient ?? buildClient(activeDatabaseUrl);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__studioxPrismaClient = prismaClient;
}

const prisma = new Proxy({}, {
  get(_, prop) {
    if (prop === '__switchDatabaseUrl') {
      return async (nextUrl) => {
        if (!nextUrl || typeof nextUrl !== 'string') {
          throw new Error('A valid database URL is required for Prisma fallback');
        }

        try {
          await prismaClient.$disconnect();
        } catch (_) {
          // Ignore disconnect failures while switching datasource
        }

        activeDatabaseUrl = nextUrl;
        prismaClient = buildClient(nextUrl);

        if (process.env.NODE_ENV !== 'production') {
          globalForPrisma.__studioxPrismaClient = prismaClient;
        }

        return prismaClient;
      };
    }

    if (prop === '__getActiveDatabaseUrl') {
      return () => activeDatabaseUrl;
    }

    return prismaClient[prop];
  },
});

module.exports = prisma;
