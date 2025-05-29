
"use client";

import type { AppData } from "@/lib/types";
import type React from "react";
import { createContext, useContext, useEffect } from "react";
import { hexToHslValues } from "@/lib/color-utils";

type Theme = AppData['theme'];

type ThemeProviderProps = {
  children: React.ReactNode;
  appData: AppData | null;
  onThemeChange: (theme: Theme) => void;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Determine initial theme based on system preference or a default
const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light'; // Fallback for SSR or non-browser environments
};

const initialState: ThemeProviderState = {
  theme: getInitialTheme(),
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  appData,
  onThemeChange,
  ...props
}: ThemeProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || !appData) {
      // If appData is null (still loading or error), we might apply a default or do nothing.
      // For now, if appData is null, we won't change existing classes or styles.
      // Initial theme class might be set by RootLayout or a system preference flicker.
      return;
    }

    const root = window.document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const themeToApply = appData.theme || systemTheme;

    root.classList.remove("light", "dark");
    root.classList.add(themeToApply);

    // Apply custom primary color
    if (appData.customPrimaryColor) {
      try {
        const hslValues = hexToHslValues(appData.customPrimaryColor);
        if (hslValues) {
          const hslString = `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`;
          root.style.setProperty('--primary', hslString);
          root.style.setProperty('--accent', hslString); // Sync accent with primary

          const ringL = Math.max(0, hslValues.l - 6);
          root.style.setProperty('--ring', `${hslValues.h} ${hslValues.s}% ${ringL}%`);
        } else {
          // Invalid custom color, remove properties to revert to theme defaults
          root.style.removeProperty('--primary');
          root.style.removeProperty('--accent');
          root.style.removeProperty('--ring');
        }
      } catch (e) {
        console.error("Failed to apply custom primary color:", e);
        root.style.removeProperty('--primary');
        root.style.removeProperty('--accent');
        root.style.removeProperty('--ring');
      }
    } else {
      // No custom color, remove properties to revert to theme defaults
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
    }
  }, [appData]); // This effect now solely depends on the appData object instance.

  // Determine the theme to provide to context consumers
  // Fallback to system theme if appData or appData.theme is not yet available
  const currentThemeForContext = appData?.theme || getInitialTheme();

  const value = {
    theme: currentThemeForContext,
    setTheme: onThemeChange, // Pass through the setTheme function from useAppData
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
