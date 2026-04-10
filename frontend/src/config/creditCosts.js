export const AI_SERVICE_CREDIT_COSTS = {
  'ai-video-summary': 5,
  'ai-subtitle-generator': 20,
  'reel-cutter': 20,
};

export const REEL_CUTTER_CAPTIONS_EXTRA_CREDITS = 5;

export const getAiServiceCreditLabel = (serviceKey) => {
  if (serviceKey === 'reel-cutter') {
    return `${AI_SERVICE_CREDIT_COSTS['reel-cutter']} credits (+${REEL_CUTTER_CAPTIONS_EXTRA_CREDITS} with captions)`;
  }

  const value = AI_SERVICE_CREDIT_COSTS[serviceKey];
  if (!value) return 'Credits may vary';
  return `${value} credits per run`;
};
