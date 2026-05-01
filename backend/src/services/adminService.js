const prisma = require('../config/prisma');

function deriveUserName(email, userId) {
  const source = String(email || userId || 'user').split('@')[0] || 'user';
  const cleaned = source.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'User';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function getAdminDashboardData(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    userCreditAggregate,
    totalOutputs,
    outputStorageAggregate,
    totalAiTasks,
    totalUsageLogs,
    totalTransactions,
    planDistribution,
    serviceDistribution,
    taskTypeDistribution,
    taskStatusDistribution,
    monthlyCreditUsage,
    recentTransactions,
    users,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { currentCredits: true } }),
    prisma.userOutput.count(),
    prisma.userOutput.aggregate({ _sum: { fileSize: true } }),
    prisma.aiTask.count(),
    prisma.usageLog.count(),
    prisma.transaction.count(),
    prisma.user.groupBy({ by: ['planId'], _count: { _all: true } }),
    prisma.userOutput.groupBy({ by: ['service'], _count: { _all: true } }),
    prisma.aiTask.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.aiTask.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.usageLog.aggregate({ where: { createdAt: { gte: monthAgo } }, _sum: { creditsUsed: true } }),
    prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      include: {
        plan: true,
        _count: {
          select: {
            usageLogs: true,
            userOutputs: true,
            aiTasks: true,
          },
        },
      },
    }),
  ]);

  const selectedUserIds = users.map((user) => user.id);

  const [selectedUserOutputs, selectedUserTasks, selectedUserUsageAgg] = await Promise.all([
    prisma.userOutput.findMany({
      where: { userId: { in: selectedUserIds } },
      select: {
        userId: true,
        service: true,
      },
    }),
    prisma.aiTask.findMany({
      where: { userId: { in: selectedUserIds } },
      select: {
        userId: true,
        type: true,
      },
    }),
    prisma.usageLog.groupBy({
      by: ['userId'],
      where: {
        userId: { in: selectedUserIds },
        createdAt: { gte: monthAgo },
      },
      _sum: {
        creditsUsed: true,
      },
    }),
  ]);

  const servicesByUser = new Map();
  for (const item of selectedUserOutputs) {
    if (!servicesByUser.has(item.userId)) {
      servicesByUser.set(item.userId, new Set());
    }
    servicesByUser.get(item.userId).add(item.service);
  }

  for (const item of selectedUserTasks) {
    if (!servicesByUser.has(item.userId)) {
      servicesByUser.set(item.userId, new Set());
    }
    servicesByUser.get(item.userId).add(item.type);
  }

  const usageByUser = new Map();
  for (const item of selectedUserUsageAgg) {
    usageByUser.set(item.userId, Number(item._sum.creditsUsed || 0));
  }

  const usersInfo = users.map((user) => {
    const servicesUsed = Array.from(servicesByUser.get(user.id) || []);

    return {
      userId: user.id,
      name: deriveUserName(user.email, user.id),
      email: user.email,
      plan: {
        name: user.plan?.name || 'Unassigned',
        monthlyCredits: user.plan?.monthlyCredits || 0,
        isUnlimited: Boolean(user.plan?.isUnlimited),
      },
      credits: {
        current: user.currentCredits,
        usedThisMonth: usageByUser.get(user.id) || 0,
      },
      profile: {
        country: null,
        age: null,
      },
      usage: {
        servicesUsed,
        outputCount: user._count.userOutputs,
        aiTaskCount: user._count.aiTasks,
        usageLogCount: user._count.usageLogs,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });

  const planLookup = new Map();
  const plans = await prisma.plan.findMany({
    select: {
      id: true,
      name: true,
      monthlyCredits: true,
      isUnlimited: true,
    },
  });
  plans.forEach((plan) => planLookup.set(plan.id, plan));

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users: totalUsers,
      currentCreditsAcrossUsers: Number(userCreditAggregate._sum.currentCredits || 0),
      outputs: totalOutputs,
      outputStorageBytes: Number(outputStorageAggregate._sum.fileSize || 0),
      aiTasks: totalAiTasks,
      usageLogs: totalUsageLogs,
      transactions: totalTransactions,
      creditsUsedLast30Days: Number(monthlyCreditUsage._sum.creditsUsed || 0),
    },
    distributions: {
      plans: planDistribution.map((item) => ({
        planId: item.planId,
        planName: planLookup.get(item.planId)?.name || 'Unassigned',
        users: item._count._all,
      })),
      services: serviceDistribution.map((item) => ({
        service: item.service,
        count: item._count._all,
      })),
      aiTaskTypes: taskTypeDistribution.map((item) => ({
        type: item.type,
        count: item._count._all,
      })),
      aiTaskStatus: taskStatusDistribution.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
    },
    recentTransactions,
    users: usersInfo,
  };
}

module.exports = {
  getAdminDashboardData,
};
