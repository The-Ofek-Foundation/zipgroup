
"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { Zap } from "lucide-react";

interface AppHeaderProps {
  onCreateNewPage: () => void;
  customPrimaryColor: string | undefined;
  onSetCustomPrimaryColor: (color?: string) => void;
}

export function AppHeader({ 
  onCreateNewPage,
  customPrimaryColor,
  onSetCustomPrimaryColor
}: AppHeaderProps) {

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary">ZipGroup</h1>
        </div>
        {/* Page title input removed from here */}
        <div className="flex items-center gap-1">
          <Button variant="outline" onClick={onCreateNewPage} size="sm">New Page</Button>
          <CustomColorPicker 
            currentCustomColor={customPrimaryColor}
            onSetCustomColor={onSetCustomPrimaryColor}
          />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
