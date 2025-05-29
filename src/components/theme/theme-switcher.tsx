
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ThemeSwitcherProps {
  disabled?: boolean;
}

export function ThemeSwitcher({ disabled = false }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (disabled) return;
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" disabled={disabled}>
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Toggle theme ({theme === 'light' ? 'dark' : 'light'})</p>
      </TooltipContent>
    </Tooltip>
  );
}
