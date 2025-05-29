
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { Zap } from "lucide-react";

interface AppHeaderProps {
  pageTitle: string;
  onPageTitleChange: (newTitle: string) => void;
  onCreateNewPage: () => void;
  customPrimaryColor: string | undefined;
  onSetCustomPrimaryColor: (color?: string) => void;
}

export function AppHeader({ 
  pageTitle, 
  onPageTitleChange, 
  onCreateNewPage,
  customPrimaryColor,
  onSetCustomPrimaryColor
}: AppHeaderProps) {
  const [currentTitle, setCurrentTitle] = useState(pageTitle);

  useEffect(() => {
    setCurrentTitle(pageTitle);
  }, [pageTitle]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTitle(event.target.value);
  };

  const handleTitleBlur = () => {
    onPageTitleChange(currentTitle);
  };
  
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onPageTitleChange(currentTitle);
      (event.target as HTMLInputElement).blur();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary">LinkWarp</h1>
        </div>
        <div className="flex-1 px-4 md:px-8 lg:px-16">
          <Input
            type="text"
            value={currentTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyPress={handleKeyPress}
            className="w-full text-center text-lg font-semibold bg-transparent border-0 shadow-none focus-visible:ring-0 focus:border-b focus:border-primary"
            aria-label="Page Title"
          />
        </div>
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
