import { useState, useEffect } from 'react';

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    notifications: true,
    language: 'en'
  });

  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  return {
    preferences,
    updatePreferences
  };
}
