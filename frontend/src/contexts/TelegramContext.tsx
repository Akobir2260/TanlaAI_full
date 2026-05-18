import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { TelegramContext } from './telegram-context';
import type { TelegramUser } from '../types';

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [webApp] = useState<TelegramWebApp | null>(() => window.Telegram?.WebApp ?? null);
  const [user] = useState<TelegramWebAppUser | null>(() => webApp?.initDataUnsafe?.user ?? null);
  const [profile, setProfile] = useState<TelegramUser | null>(null);
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<'buyer' | 'seller'>('buyer');
  const [hasSetInitialMode, setHasSetInitialMode] = useState(false);

  useEffect(() => {
    if (profile && !hasSetInitialMode) {
      setViewMode(profile.role === 'COMPANY' || profile.has_company ? 'seller' : 'buyer');
      setHasSetInitialMode(true);
    }
  }, [profile, hasSetInitialMode]);

  const authenticate = async () => {
    try {
      let response;
      // Read initData fresh from window at call time (not from stale state)
      const initData = window.Telegram?.WebApp?.initData;

      if (initData) {
        // Inside Telegram with valid initData — POST to authenticate
        response = await apiClient.post('/auth/telegram/', { initData });
      } else if (webApp) {
        // Inside Telegram WebApp but initData is empty (some clients/versions)
        // Try session-based refresh
        response = await apiClient.get('/auth/telegram/');
      } else {
        // Browser mode — try session
        response = await apiClient.get('/auth/telegram/');
      }

      if (response.data?.user) {
        setProfile(response.data.user);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      // 401 = not authenticated (expected), ignore silently
      if (status !== 401) {
        console.error('Authentication failed:', err);
      }
    }
  };

  const refreshProfile = async () => {
    await authenticate();
  };

  useEffect(() => {
    if (webApp) {
      webApp.ready();
      webApp.expand();
      if (webApp.isVersionAtLeast('6.1')) {
        webApp.setHeaderColor('#f9f9f9');
        webApp.setBackgroundColor('#f9f9f9');
      }
    }
    authenticate().finally(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const haptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    if (webApp?.HapticFeedback && webApp.isVersionAtLeast('6.1')) {
      webApp.HapticFeedback.impactOccurred(style);
    }
  };

  return (
    <TelegramContext.Provider value={{ webApp, user, profile, ready, haptic, refreshProfile, viewMode, setViewMode }}>
      {children}
    </TelegramContext.Provider>
  );
};
