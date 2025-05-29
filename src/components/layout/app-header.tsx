
"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { Zap, ListChecks, Share2 } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppHeaderProps {
  onCreateNewPage: () => void;
  customPrimaryColor: string | undefined;
  onSetCustomPrimaryColor: (color?: string) => void;
  isReadOnlyPreview?: boolean;
  onInitiateShare?: () => void; 
  canShareCurrentPage?: boolean;
}

export function AppHeader({
  onCreateNewPage,
  customPrimaryColor,
  onSetCustomPrimaryColor,
  isReadOnlyPreview = false,
  onInitiateShare,
  canShareCurrentPage = false,
}: AppHeaderProps) {

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary">ZipGroup</h1>
        </div>
        <div className="flex items-center gap-2" data-joyride="app-header-controls">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <span className="flex items-center gap-1.5">
                <ListChecks />
                Dashboard
              </span>
            </Link>
          </Button>
          <Button variant="outline" onClick={onCreateNewPage} size="sm">New Page</Button>
          
          {onInitiateShare && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onInitiateShare}
                  disabled={!canShareCurrentPage}
                  aria-label="Share this page"
                  data-joyride="share-current-page-button"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{canShareCurrentPage ? "Share this page" : "Save the page first to enable sharing"}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <CustomColorPicker
            currentCustomColor={customPrimaryColor}
            onSetCustomColor={onSetCustomPrimaryColor}
            disabled={isReadOnlyPreview}
            joyrideProps={{ "data-joyride": "custom-color-picker" }}
          />
          <ThemeSwitcher 
            disabled={isReadOnlyPreview} 
            joyrideProps={{ "data-joyride": "theme-switcher" }}
          />
        </div>
      </div>
    </header>
  );
}
