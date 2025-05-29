
'use client';

import { useState, useEffect, useCallback } from 'react';

const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';

type DashboardThemeMode = 'light' | 'dark';

interface DashboardThemeState {
  themeMode: DashboardThemeMode;
  customPrimaryColor?: string;
}

export function useDashboardTheme() {
  const [themeState, setThemeState] = useState<DashboardThemeState>({
    themeMode: 'light', // Default, will be overwritten by localStorage or system preference
    customPrimaryColor: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let initialThemeMode: DashboardThemeMode = 'light';
    if (typeof window !== 'undefined') {
      const storedThemeMode = localStorage.getItem(DASHBOARD_THEME_MODE_KEY) as DashboardThemeMode | null;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      initialThemeMode = storedThemeMode || systemTheme;
    }
    
    const storedCustomColor = typeof window !== 'undefined' ? localStorage.getItem(DASHBOARD_CUSTOM_COLOR_KEY) : null;
    
    setThemeState({
      themeMode: initialThemeMode,
      customPrimaryColor: storedCustomColor || undefined,
    });
    setIsLoading(false);
  }, []);

  const setDashboardThemeMode = useCallback((mode: DashboardThemeMode) => {
    setThemeState(prev => ({ ...prev, themeMode: mode }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(DASHBOARD_THEME_MODE_KEY, mode);
    }
  }, []);

  const setDashboardCustomPrimaryColor = useCallback((color?: string) => {
    setThemeState(prev => ({ ...prev, customPrimaryColor: color }));
    if (typeof window !== 'undefined') {
      if (color) {
        localStorage.setItem(DASHBOARD_CUSTOM_COLOR_KEY, color);
      } else {
        localStorage.removeItem(DASHBOARD_CUSTOM_COLOR_KEY);
      }
    }
  }, []);

  return {
    ...themeState,
    isLoading,
    setDashboardThemeMode,
    setDashboardCustomPrimaryColor,
  };
}
