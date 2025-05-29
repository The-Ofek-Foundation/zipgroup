
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme as usePageTheme } from "@/components/theme/theme-provider"; // Renamed for clarity if used
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ThemeSwitcherProps {
  disabled?: boolean;
  theme?: 'light' | 'dark'; // Optional prop for direct control
  setTheme?: (theme: 'light' | 'dark') => void; // Optional prop for direct control
  joyrideProps?: Record<string, unknown>; // For react-joyride targeting
}

export function ThemeSwitcher({ disabled = false, theme: propTheme, setTheme: propSetTheme, joyrideProps }: ThemeSwitcherProps) {
  // Attempt to use context if props are not provided
  const context = usePageTheme(); 
  
  // Determine which theme and setTheme function to use
  // Props take precedence if provided
  const currentTheme = propTheme !== undefined ? propTheme : context.theme;
  const currentSetTheme = propSetTheme !== undefined ? propSetTheme : context.setTheme;

  const toggleTheme = () => {
    if (disabled) return;
    if (currentSetTheme) {
      currentSetTheme(currentTheme === "light" ? "dark" : "light");
    }
  };

  // Fallback if no theme source is available (should not happen in practice if used correctly)
  if (currentTheme === undefined || currentSetTheme === undefined) {
    return null; 
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          aria-label="Toggle theme" 
          disabled={disabled}
          {...joyrideProps} // Spread joyrideProps here
        >
          {currentTheme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Toggle theme ({currentTheme === 'light' ? 'dark' : 'light'})</p>
      </TooltipContent>
    </Tooltip>
  );
}
