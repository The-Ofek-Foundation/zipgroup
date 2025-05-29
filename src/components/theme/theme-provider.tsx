
"use client";

import type { AppData } from "@/lib/types";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { hexToHslValues } from "@/lib/color-utils";

type Theme = AppData['theme'];

type ThemeProviderProps = {
  children: React.ReactNode;
  appData: AppData | null; // Pass the whole appData object
  onThemeChange: (theme: Theme) => void; // This is `setTheme` from `useAppData`
};

type ThemeProviderState = {
  theme: Theme; // This refers to light/dark
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "light", // Default, will be quickly overridden by appData
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  appData,
  onThemeChange, // This is effectively useAppData().setTheme
  ...props
}: ThemeProviderProps) {
  // Determine the current light/dark theme from appData or system preference as fallback
  const [effectiveTheme, setEffectiveTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        return appData?.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    return 'light'; // Fallback for SSR, though this component is client-side
  });

  useEffect(() => {
    if (appData?.theme) {
      setEffectiveTheme(appData.theme);
    } else if (typeof window !== 'undefined') {
      // If appData.theme is somehow null/undefined after load, fallback to system
      setEffectiveTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  }, [appData?.theme]);


  useEffect(() => {
    if (typeof window === 'undefined' || !appData) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme); // effectiveTheme is the light/dark state

    // Apply custom primary color
    if (appData.customPrimaryColor) {
      try {
        const hslValues = hexToHslValues(appData.customPrimaryColor);
        if (hslValues) {
          const hslString = `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`;
          root.style.setProperty('--primary', hslString);
          root.style.setProperty('--accent', hslString); // Sync accent with primary

          // For --ring, let's make it slightly darker than primary
          // The L value reduction might differ for light/dark, but for simplicity:
          const ringL = Math.max(0, hslValues.l - 6); // 6% darker, ensure not negative
          root.style.setProperty('--ring', `${hslValues.h} ${hslValues.s}% ${ringL}%`);
        } else {
          throw new Error("Invalid HEX color for custom primary.");
        }
      } catch (e) {
        console.error("Failed to apply custom primary color:", e);
        root.style.removeProperty('--primary');
        root.style.removeProperty('--accent');
        root.style.removeProperty('--ring');
      }
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
    }
  }, [effectiveTheme, appData]); // Re-run when light/dark theme or custom color changes

  // This function is called by ThemeSwitcher to change light/dark mode
  const setTheme = (newTheme: Theme) => {
    onThemeChange(newTheme); // This updates appData.theme via useAppData().setTheme
  };

  const value = {
    theme: effectiveTheme, // Provide the current light/dark theme
    setTheme, // Provide the function to change light/dark theme
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
