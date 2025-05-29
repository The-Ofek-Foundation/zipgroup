
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DialogTrigger } from "@/components/ui/dialog"; // Keep for Tooltip + Button trigger pattern
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { HomeIcon as PageHomeIcon, PlusCircle, BookOpenCheck, FileText, Layers, SunMoon, Palette, Clock, Share2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppData } from "@/hooks/use-app-data";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { hexToHslValues } from "@/lib/color-utils";
import { format } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import type { AppData } from "@/lib/types";
import { AppFooter } from "@/components/layout/app-footer";

const LOCAL_STORAGE_PREFIX_DASHBOARD = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";
const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';
const JOYRIDE_SAMPLE_TAKEN_KEY = "linkwarp_joyride_sample_taken";

interface StoredPage {
  hash: string;
  title: string;
  linkGroupCount: number;
  theme: 'light' | 'dark';
  customPrimaryColor?: string;
  lastModified?: number;
}

interface SortablePageCardItemProps {
  page: StoredPage;
  onDelete: (hash: string) => void;
  onShare: (hash: string) => void;
}

function SortablePageCardItem({ page, onDelete, onShare }: SortablePageCardItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.hash });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
  };

  const stopPropagationForEvents = (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => {
     if (e.type === "pointerdown") { // Be specific to pointerdown for drag
      e.stopPropagation();
    }
  };

  const handleDeleteConfirm = () => {
    onDelete(page.hash);
    setIsDeleteDialogOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-manipulation",
        isDragging ? "z-50 opacity-75 shadow-2xl ring-2 ring-primary cursor-grabbing" : "z-auto cursor-grab"
      )}
      {...attributes}
      {...listeners}
    >
      <Card
        className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
      >
        <CardHeader className="pb-4">
          <Link
            href={`/#${page.hash}`}
            className="block group"
            onClick={stopPropagationForEvents}
            onPointerDown={stopPropagationForEvents}
            onKeyDown={stopPropagationForEvents}
            tabIndex={0}
          >
            <CardTitle className="text-xl font-semibold text-primary group-hover:underline truncate" title={page.title}>
              {page.title}
            </CardTitle>
          </Link>
          <CardDescription className="text-xs pt-1">
            Hash: <code className="bg-muted px-1 py-0.5 rounded">{page.hash}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm flex-grow">
          <div className="flex items-center text-muted-foreground">
            <Layers className="mr-2 h-4 w-4" />
            <span>{page.linkGroupCount} Link Group{page.linkGroupCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <SunMoon className="mr-2 h-4 w-4" />
            <span>Theme: {page.theme.charAt(0).toUpperCase() + page.theme.slice(1)}</span>
          </div>
          {page.customPrimaryColor && (
            <div className="flex items-center text-muted-foreground">
              <Palette className="mr-2 h-4 w-4" />
              <span>Custom Color: </span>
              <span
                className="ml-1.5 h-4 w-4 rounded-full border"
                style={{ backgroundColor: page.customPrimaryColor }}
                title={page.customPrimaryColor}
              />
            </div>
          )}
          {page.lastModified && (
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4" />
              <span>
                Modified: {format(new Date(page.lastModified), "MMM d, yyyy, h:mm a")}
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-4 border-t flex justify-between items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { stopPropagationForEvents(e); onShare(page.hash); }}
                  onPointerDown={stopPropagationForEvents}
                  aria-label={`Share page ${page.title}`}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy share link for this page</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    aria-label={`Delete page ${page.title}`}
                    onClick={() => setIsDeleteDialogOpen(true)}
                    // onPointerDown is NOT stopped here to allow dnd-kit activation constraints to work
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete page</p>
              </TooltipContent>
            </Tooltip>
        </CardFooter>
      </Card>
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Are you absolutely sure?"
        description={
          <>
            This action cannot be undone. This will permanently delete the page <strong className="mx-1">{page.title}</strong> (hash: {page.hash}) and all its link groups.
          </>
        }
        onConfirm={handleDeleteConfirm}
        confirmText="Delete Page"
        confirmVariant="destructive"
      />
    </div>
  );
}

export function DashboardView() {
  const [pages, setPages] = useState<StoredPage[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();
  const { createNewBlankPageAndRedirect } = useAppData();


  const {
    themeMode,
    customPrimaryColor,
    isLoading: isThemeLoading,
    setDashboardThemeMode,
    setDashboardCustomPrimaryColor
  } = useDashboardTheme();

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    const allLoadedPages: StoredPage[] = [];
    let initialStoredOrder: string[] = [];

    if (typeof window !== 'undefined') {
      try {
        const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
        if (orderJson) {
          initialStoredOrder = JSON.parse(orderJson);
        }
      } catch (error)
        {
        console.error("Failed to parse page order from local storage:", error);
        initialStoredOrder = [];
      }

      const excludedKeys = [
        DASHBOARD_ORDER_KEY,
        DASHBOARD_THEME_MODE_KEY,
        DASHBOARD_CUSTOM_COLOR_KEY,
        JOYRIDE_SAMPLE_TAKEN_KEY 
      ];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.startsWith(LOCAL_STORAGE_PREFIX_DASHBOARD) &&
          !excludedKeys.includes(key) 
        ) {
          try {
            const storedData = localStorage.getItem(key);
            if (storedData) {
              const parsedData = JSON.parse(storedData) as AppData;
              const hash = key.substring(LOCAL_STORAGE_PREFIX_DASHBOARD.length);

              if (typeof parsedData.pageTitle !== 'string' || !Array.isArray(parsedData.linkGroups)) {
                console.warn(`Skipping localStorage key '${key}' as it does not appear to be valid AppData.`);
                continue;
              }

              if ((!parsedData.linkGroups || parsedData.linkGroups.length === 0) && parsedData.pageTitle === `New ZipGroup Page`) {
                localStorage.removeItem(key);
                initialStoredOrder = initialStoredOrder.filter(h => h !== hash);
                continue;
              }

              allLoadedPages.push({
                hash: hash,
                title: parsedData.pageTitle || `New ZipGroup Page`,
                linkGroupCount: parsedData.linkGroups?.length || 0,
                theme: parsedData.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
                customPrimaryColor: parsedData.customPrimaryColor,
                lastModified: parsedData.lastModified,
              });
            }
          } catch (error) {
            console.error("Failed to parse page data from local storage:", key, error);
          }
        }
      }

      const existingPageHashes = new Set(allLoadedPages.map(p => p.hash));
      const validStoredOrder = initialStoredOrder.filter(hash => existingPageHashes.has(hash));

      if (validStoredOrder.length !== initialStoredOrder.length) {
         localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(validStoredOrder));
      }

      const pageMap = new Map(allLoadedPages.map(p => [p.hash, p]));
      const finalPages: StoredPage[] = [];
      const processedHashes = new Set<string>();

      for (const hash of validStoredOrder) {
        const page = pageMap.get(hash);
        if (page) {
          finalPages.push(page);
          processedHashes.add(hash);
        }
      }

      const remainingPages = allLoadedPages
        .filter(p => !processedHashes.has(p.hash))
        .sort((a, b) => {
            if (a.lastModified && b.lastModified) {
                return b.lastModified - a.lastModified;
            }
            if (a.lastModified) return -1;
            if (b.lastModified) return 1;
            return a.title.localeCompare(b.title);
        });

      setPages([...finalPages, ...remainingPages]);
    }
    setInitialDataLoaded(true);
  }, []);

  useEffect(() => {
    if (initialDataLoaded && !isThemeLoading) {
      setIsLoadingData(false);
    }
  }, [initialDataLoaded, isThemeLoading]);

  useEffect(() => {
    if (isThemeLoading || typeof window === 'undefined') return;

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(themeMode);

    if (customPrimaryColor) {
      const hslValues = hexToHslValues(customPrimaryColor);
      if (hslValues) {
        const hslString = `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`;
        root.style.setProperty('--primary', hslString);
        root.style.setProperty('--accent', hslString);
        const ringL = Math.max(0, hslValues.l - 6);
        root.style.setProperty('--ring', `${hslValues.h} ${hslValues.s}% ${ringL}%`);
      } else {
        root.style.removeProperty('--primary');
        root.style.removeProperty('--accent');
        root.style.removeProperty('--ring');
      }
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
    }
  }, [themeMode, customPrimaryColor, isThemeLoading]);

  const handleCreateNewPage = () => {
    createNewBlankPageAndRedirect();
  };

  const handleDeletePage = (hashToDelete: string) => {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}${hashToDelete}`);
      setPages(prevPages => {
        const newPages = prevPages.filter(p => p.hash !== hashToDelete);
        const newOrder = newPages.map(p => p.hash);
        localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(newOrder));
        return newPages;
      });
      toast({
        title: "Page Deleted",
        description: `The page "${pages.find(p => p.hash === hashToDelete)?.title || hashToDelete}" has been removed.`,
      });
    } catch (error) {
      console.error("Failed to delete page:", error);
      toast({
        title: "Error",
        description: "Could not delete the page.",
        variant: "destructive",
      });
    }
  };

  const handleSharePage = async (hash: string) => {
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { lastModified, ...shareableData } = parsedData;

        const jsonString = JSON.stringify(shareableData);
        const encodedJson = encodeURIComponent(jsonString);
        const shareUrl = `${window.location.origin}/?sharedData=${encodedJson}#${hash}`;

        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Share Link Copied!",
          description: "The link to share this page has been copied to your clipboard.",
          duration: 7000,
        });
      } else {
        throw new Error("Page data not found for sharing.");
      }
    } catch (error) {
      console.error("Failed to create share link:", error);
      toast({
        title: "Share Failed",
        description: "Could not create or copy the share link.",
        variant: "destructive",
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndPages = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setPages((currentPages) => {
        const oldIndex = currentPages.findIndex((p) => p.hash === active.id);
        const newIndex = currentPages.findIndex((p) => p.hash === over.id);
        if (oldIndex === -1 || newIndex === -1) return currentPages;

        const reorderedPages = arrayMove(currentPages, oldIndex, newIndex);
        const newOrderOfHashes = reorderedPages.map(p => p.hash);
        if (typeof window !== 'undefined') {
          localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(newOrderOfHashes));
        }
        return reorderedPages;
      });
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl text-muted-foreground">Loading your ZipGroup home...</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <PageHomeIcon className="mr-2 h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold text-primary">
                <span className="inline sm:hidden">ZG</span>
                <span className="hidden sm:inline">ZipGroup</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleCreateNewPage} size="sm" aria-label="New Page">
                    <PlusCircle className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">New Page</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create New Page</p>
                </TooltipContent>
              </Tooltip>
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
              <CustomColorPicker
                currentCustomColor={customPrimaryColor}
                onSetCustomColor={setDashboardCustomPrimaryColor}
              />
              <ThemeSwitcher
                theme={themeMode}
                setTheme={setDashboardThemeMode}
              />
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 md:p-8">
          {pages.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="mx-auto h-16 w-16 text-primary mb-6" />
              <h2 className="mt-2 text-2xl font-semibold text-foreground">No ZipGroup Pages Yet</h2>
              <p className="mt-2 text-lg text-muted-foreground">
                Looks like your home page is empty. Let's create your first page!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <Button onClick={handleCreateNewPage} size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create Your First Page
                </Button>
                 <Button variant="outline" size="lg" asChild>
                  <Link href="/sample">
                    <BookOpenCheck className="mr-2 h-5 w-5" />
                    Explore Sample Page
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndPages}>
              <SortableContext items={pages.map(p => p.hash)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pages.map(page => (
                    <SortablePageCardItem
                      key={page.hash}
                      page={page}
                      onDelete={handleDeletePage}
                      onShare={handleSharePage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </main>
         <AppFooter onCreateNewPage={handleCreateNewPage} />
      </div>
    </TooltipProvider>
  );
}
