const PLAN_DEFINITIONS = {
  Free: {
    name: 'Free',
    monthlyCredits: 100,
    priceUsd: 0,
    isUnlimited: false,
  },
  Standard: {
    name: 'Standard',
    monthlyCredits: 500,
    priceUsd: 9,
    isUnlimited: false,
  },
  Pro: {
    name: 'Pro',
    monthlyCredits: 2000,
    priceUsd: 29,
    isUnlimited: false,
  },
};

const CREDIT_EXCEPTION_EMAILS = new Set(
  String(process.env.CREDIT_EXCEPTION_EMAILS || '')
    .split(',')
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean)
);

const AI_FEATURE_CREDITS = {
  AI_SUBTITLE_GENERATOR: 20,
  AI_VIDEO_SUMMARY: 5,
  AI_REEL_CUTTER_BASE: 20,
  AI_REEL_CUTTER_CAPTION_ADDON: 5,
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isCreditExemptEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && CREDIT_EXCEPTION_EMAILS.has(normalized);
}

module.exports = {
  PLAN_DEFINITIONS,
  CREDIT_EXCEPTION_EMAILS,
  AI_FEATURE_CREDITS,
  isCreditExemptEmail,
};
