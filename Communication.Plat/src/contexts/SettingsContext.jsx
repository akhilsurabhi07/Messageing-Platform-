import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function useSettings() {
  return useContext(SettingsContext);
}

const DEFAULTS = {
  notifications: true,
  darkMode: true,
  readReceipts: true,
  messageSound: true,
  language: 'English',
  fontSize: 'Medium',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('commplat_settings');
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // Persist to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('commplat_settings', JSON.stringify(settings));
  }, [settings]);

  // Request browser notification permission when enabled
  useEffect(() => {
    if (settings.notifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [settings.notifications]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Helper to send a browser notification
  const sendNotification = (title, body) => {
    if (settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' });
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, sendNotification }}>
      {children}
    </SettingsContext.Provider>
  );
}
