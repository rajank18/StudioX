import React from 'react';

const formatCredits = (value) => {
  if (value === null || value === undefined) return '--';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '--';
  return parsed.toLocaleString();
};

const CreditStatusCard = ({ credits, isLoading = false, isDarkMode = false, className = '' }) => {
  const isExempt = Boolean(credits?.isCreditExempt);
  const currentCredits = isExempt ? 'Unlimited' : formatCredits(credits?.currentCredits);
  const planName = credits?.planName || 'Free';

  return (
    <div
      className={`rounded-2xl px-4 py-3 border ${isDarkMode
        ? 'border-[#2b3445] bg-[linear-gradient(150deg,#1d2431_0%,#161c27_100%)]'
        : 'border-orange-200 bg-orange-50/80'} ${className}`}
    >
      <p className={`text-xs font-medium tracking-wide uppercase ${isDarkMode ? 'text-[#c9d2e2]' : 'text-[#a55615]'}`}>
        Total Credits
      </p>
      <div className="flex items-end gap-2 mt-1">
        <span className={`text-2xl font-bold leading-none ${isDarkMode ? 'text-[#fff8e8]' : 'text-[#7a3a00]'}`}>
          {isLoading ? '...' : currentCredits}
        </span>
      </div>
      <p className={`text-xs mt-1 ${isDarkMode ? 'text-[#9aa6bc]' : 'text-[#9b4e12]'}`}>{planName} Plan</p>
    </div>
  );
};

export default CreditStatusCard;
