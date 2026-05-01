import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const CREDIT_CACHE_KEY_PREFIX = 'studiox-credit-cache';

const CreditContext = createContext(null);

export const CreditProvider = ({ children }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [credits, setCredits] = useState(() => {
    try {
      const userId = window.localStorage.getItem('studiox-last-user-id');
      if (!userId) return null;
      const raw = window.localStorage.getItem(`${CREDIT_CACHE_KEY_PREFIX}:${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setCredits(null);
      return;
    }

    try {
      window.localStorage.setItem('studiox-last-user-id', user.id);
      const raw = window.localStorage.getItem(`${CREDIT_CACHE_KEY_PREFIX}:${user.id}`);
      if (raw) {
        const cachedCredits = JSON.parse(raw);
        setCredits(cachedCredits);
      }
    } catch (_) {
      // Ignore cache read errors and continue with network fetch.
    }
  }, [user?.id]);

  const refreshCredits = useCallback(async () => {
    if (!user?.id) {
      setCredits(null);
      return null;
    }

    setIsLoadingCredits(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/users/credits`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-User-Id': user.id,
          'X-User-Email': user?.emailAddresses?.[0]?.emailAddress || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user credits');
      }

      const payload = await response.json();
      const nextCredits = payload?.credits || null;
      setCredits(nextCredits);

      try {
        if (user?.id && nextCredits) {
          window.localStorage.setItem(`${CREDIT_CACHE_KEY_PREFIX}:${user.id}`, JSON.stringify(nextCredits));
        }
      } catch (_) {
        // Ignore cache write errors.
      }

      return nextCredits;
    } catch (_) {
      return null;
    } finally {
      setIsLoadingCredits(false);
    }
  }, [getToken, user?.emailAddresses, user?.id]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const value = useMemo(() => ({
    credits,
    isLoadingCredits,
    refreshCredits,
  }), [credits, isLoadingCredits, refreshCredits]);

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
};

export const useCredits = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error('useCredits must be used within CreditProvider');
  }
  return context;
};
