import { createContext } from 'react';

import type { TelegramUser } from '../types';

export interface TelegramContextType {
  webApp: TelegramWebApp | null;
  user: TelegramWebAppUser | null;
  profile: TelegramUser | null;
  ready: boolean;
  haptic: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  refreshProfile: () => Promise<void>;
  viewMode: 'buyer' | 'seller';
  setViewMode: (mode: 'buyer' | 'seller') => void;
}

export const TelegramContext = createContext<TelegramContextType | undefined>(undefined);
