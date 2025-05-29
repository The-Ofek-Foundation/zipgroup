
"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { Zap, HomeIcon, Share2, PlusCircle, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePathname } from 'next/navigation';


interface AppHeaderProps {
  onCreateNewPage: () => void;

  customPrimaryColor: string | undefined;
  onSetCustomPrimaryColor: (color?: string) => void;
  
  themeMode?: 'light' | 'dark';
  onSetThemeMode?: (theme: 'light' | 'dark') => void;

  showHomePageLink?: boolean;
  showSamplePageLink?: boolean;
  showShareButton?: boolean;
  
  onInitiateShare?: () => void;
  canShareCurrentPage?: boolean;
  
  isReadOnlyPreview?: boolean;
  joyrideProps?: Record<string, unknown>; 
}

export function AppHeader({
  onCreateNewPage,
  customPrimaryColor,
  onSetCustomPrimaryColor,
  themeMode,
  onSetThemeMode,
  showHomePageLink = true,
  showSamplePageLink = false,
  showShareButton = true,
  onInitiateShare,
  canShareCurrentPage = false,
  isReadOnlyPreview = false,
  joyrideProps = {},
}: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary">
            <span className="inline sm:hidden">ZG</span>
            <span className="hidden sm:inline">ZipGroup</span>
          </h1>
        </div>
        <div className="flex items-center gap-2" {...joyrideProps}>
          {showHomePageLink && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="sm">
                  <Link href="/">
                    <span className="flex items-center gap-1.5">
                      <HomeIcon className="h-4 w-4"/>
                      <span className="hidden md:inline">Home</span>
                    </span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to Home Page</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onCreateNewPage}
                size="sm"
                disabled={isReadOnlyPreview && pathname !== '/sample' && pathname !== '/'} 
                aria-label="New Page"
              >
                <PlusCircle className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">New Page</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create New Page</p>
            </TooltipContent>
          </Tooltip>

          {showSamplePageLink && (
             <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild aria-label="View Sample Page">
                    <Link href="/sample">
                      <BookOpenCheck className="h-4 w-4 md:mr-2" />
                       <span className="hidden md:inline">View Sample</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                   <p>View Sample Page</p>
                </TooltipContent>
              </Tooltip>
          )}

          {showShareButton && onInitiateShare && (
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
            theme={themeMode} // Pass themeMode if available
            setTheme={onSetThemeMode} // Pass onSetThemeMode if available
            disabled={isReadOnlyPreview}
            joyrideProps={{ "data-joyride": "theme-switcher" }}
          />
        </div>
      </div>
    </header>
  );
}
