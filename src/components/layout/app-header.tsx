
"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { Zap, Home, Share2 } from "lucide-react"; // Changed ListChecks to Home
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppHeaderProps {
  onCreateNewPage: () => void;
  customPrimaryColor: string | undefined;
  onSetCustomPrimaryColor: (color?: string) => void;
  isReadOnlyPreview?: boolean;
  onInitiateShare?: () => void; 
  canShareCurrentPage?: boolean;
  joyrideProps?: Record<string, unknown>; 
}

export function AppHeader({
  onCreateNewPage,
  customPrimaryColor,
  onSetCustomPrimaryColor,
  isReadOnlyPreview = false,
  onInitiateShare,
  canShareCurrentPage = false,
  joyrideProps = {},
}: AppHeaderProps) {

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary">ZipGroup</h1>
        </div>
        <div className="flex items-center gap-2" {...joyrideProps}>
          <Button asChild variant="outline" size="sm">
             <Link href="/">
              <span className="flex items-center gap-1.5">
                <Home className="h-4 w-4"/> {/* Changed from ListChecks */}
                Dashboard
              </span>
            </Link>
          </Button>
          {/* New Page button is disabled on shared previews, but enabled on /sample to allow saving the sample */}
          <Button variant="outline" onClick={onCreateNewPage} size="sm" disabled={isReadOnlyPreview && !canShareCurrentPage && pathname !== '/sample'}>New Page</Button>
          
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
