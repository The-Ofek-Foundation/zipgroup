
"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { Zap, HomeIcon as PageHomeIcon, Share2, PlusCircle, BookOpenCheck, Trash2 } from "lucide-react";
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

  onInitiateDelete?: () => void;
  canDeleteCurrentPage?: boolean;
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
  onInitiateDelete,
  canDeleteCurrentPage = false,
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
                      <PageHomeIcon className="h-4 w-4"/>
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
                // New Page button is disabled on shared previews, but enabled on /sample 
                // because clicking it from /sample effectively "saves" the sample.
                // It should also be enabled on normal pages.
                disabled={isReadOnlyPreview && pathname !== '/sample'} 
                aria-label="New Page"
              >
                <PlusCircle className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">New Page</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Page</p>
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

          {onInitiateDelete && canDeleteCurrentPage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onInitiateDelete}
                  aria-label="Delete this page"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete this page</p>
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
            theme={themeMode} 
            setTheme={onSetThemeMode} 
            disabled={isReadOnlyPreview}
            joyrideProps={{ "data-joyride": "theme-switcher" }}
          />
        </div>
      </div>
    </header>
  );
}
