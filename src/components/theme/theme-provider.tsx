
"use client";

import type { AppData } from "@/lib/types";
import type React from "react";
import { createContext, useContext, useEffect } from "react";
import { hexToHslValues } from "@/lib/color-utils";

type Theme = AppData['theme'];

type ThemeProviderProps = {
  children: React.ReactNode;
  appData: AppData | null; // appData can be null initially
  onThemeChange: (theme: Theme) => void; // Callback to change theme in appData
};

type ThemeProviderState = {
  theme: Theme; // Current theme (light/dark)
  setTheme: (theme: Theme) => void; // Function to set the theme
};

const getInitialSystemTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light'; // Fallback for SSR or non-browser environments
};

const initialState: ThemeProviderState = {
  theme: getInitialSystemTheme(),
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  appData, // This comes from useAppData via page.tsx
  onThemeChange, // This is useAppData's setTheme function
  ...props
}: ThemeProviderProps) {

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;

    // Determine and apply light/dark theme class
    const systemTheme = getInitialSystemTheme();
    // Use appData.theme if available and valid, otherwise fallback to systemTheme
    const themeToApply = appData?.theme && ['light', 'dark'].includes(appData.theme) 
                         ? appData.theme 
                         : systemTheme;

    root.classList.remove("light", "dark");
    root.classList.add(themeToApply);

    // Apply custom primary color if set in appData
    // This is the "official" application of the color from saved state.
    // CustomColorPicker handles its own live preview separately.
    if (appData?.customPrimaryColor) {
      try {
        const hslValues = hexToHslValues(appData.customPrimaryColor);
        if (hslValues) {
          const hslString = `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`;
          root.style.setProperty('--primary', hslString);
          root.style.setProperty('--accent', hslString); // Sync accent with primary

          // Adjust ring color based on the new primary's lightness
          const ringL = Math.max(0, hslValues.l - 6); // Slightly darker for ring
          root.style.setProperty('--ring', `${hslValues.h} ${hslValues.s}% ${ringL}%`);
        } else {
          // Invalid custom color in appData, revert to theme defaults
          root.style.removeProperty('--primary');
          root.style.removeProperty('--accent');
          root.style.removeProperty('--ring');
        }
      } catch (e) {
        console.error("Failed to apply custom primary color from appData:", e);
        root.style.removeProperty('--primary');
        root.style.removeProperty('--accent');
        root.style.removeProperty('--ring');
      }
    } else {
      // No custom color in appData, remove properties to revert to theme defaults in CSS
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
    }
  }, [appData]); // Effect runs when appData object reference changes

  // Determine the theme value for the context (used by ThemeSwitcher)
  const currentContextTheme = appData?.theme || getInitialSystemTheme();

  const value = {
    theme: currentContextTheme,
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
