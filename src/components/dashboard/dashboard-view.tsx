
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { HomeIcon as PageHomeIcon, PlusCircle, BookOpenCheck, Layers, SunMoon, Palette, Clock, Share2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme"; // For dashboard's own theme
import { useAppData } from "@/hooks/use-app-data"; // For createNewBlankPageAndRedirect
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
import { AppHeader } from "@/components/layout/app-header";
import { EmptyStateMessage } from "@/components/ui/empty-state-message";
import { PageContentSpinner } from "@/components/ui/page-content-spinner";


const LOCAL_STORAGE_PREFIX_DASHBOARD = "linkwarp_"; // Used to find pages
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";
const JOYRIDE_SAMPLE_TAKEN_KEY = "linkwarp_joyride_sample_taken";
const JOYRIDE_PRISTINE_TAKEN_KEY = "linkwarp_joyride_pristine_taken";


interface StoredPage {
  id: string;
  title: string;
  linkGroupCount: number;
  theme: 'light' | 'dark';
  customPrimaryColor?: string;
  lastModified?: number;
}

interface SortablePageCardItemProps {
  page: StoredPage;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
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
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
    zIndex: isDragging ? 50 : 'auto',
  };

  const stopPropagationForButtons = (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  const handleDeleteConfirm = () => {
    onDelete(page.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-manipulation",
        isDragging ? "opacity-75 shadow-2xl ring-2 ring-primary cursor-grabbing" : "cursor-grab"
      )}
      {...attributes}
      {...listeners}
    >
      <Card
        className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
      >
        <CardHeader className="pb-4">
          <Link
            href={`/p/${page.id}`}
            className="block group"
            onClick={stopPropagationForButtons}
            onPointerDown={stopPropagationForButtons}
            tabIndex={0}
          >
            <CardTitle className="text-xl font-semibold text-primary group-hover:underline truncate" title={page.title}>
              {page.title}
            </CardTitle>
          </Link>
          <CardDescription className="text-xs pt-1">
            ID: <code className="bg-muted px-1 py-0.5 rounded">{page.id}</code>
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
                  onClick={(e) => { stopPropagationForButtons(e); onShare(page.id); }}
                  onPointerDown={stopPropagationForButtons}
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
            This action cannot be undone. This will permanently delete the page <strong className="mx-1">{page.title}</strong> (ID: {page.id}) and all its link groups.
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
  const { createNewBlankPageAndRedirect } = useAppData(null, null);


  const {
    themeMode: dashboardThemeMode,
    customPrimaryColor: dashboardCustomPrimaryColor,
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
        if (orderJson) initialStoredOrder = JSON.parse(orderJson);
      } catch (error) { console.error("Failed to parse page order from local storage:", error); }

      const excludedKeys = [
        DASHBOARD_ORDER_KEY,
        "linkwarp_dashboard_theme_mode", 
        "linkwarp_dashboard_custom_primary_color",
        JOYRIDE_SAMPLE_TAKEN_KEY,
        JOYRIDE_PRISTINE_TAKEN_KEY,
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
              const pageId = key.substring(LOCAL_STORAGE_PREFIX_DASHBOARD.length);

              if (typeof parsedData.pageTitle !== 'string' || !Array.isArray(parsedData.linkGroups)) {
                console.warn(`Skipping localStorage key '${key}' as it does not appear to be valid AppData.`);
                continue;
              }
              
              const isEmptyDefaultPage = (!parsedData.linkGroups || parsedData.linkGroups.length === 0) && 
                                         parsedData.pageTitle === `New ZipGroup Page` && 
                                         !parsedData.customPrimaryColor;

              if (isEmptyDefaultPage) {
                localStorage.removeItem(key);
                initialStoredOrder = initialStoredOrder.filter(id => id !== pageId);
                console.log(`Removed empty default page from localStorage: ${key}`);
                continue;
              }

              allLoadedPages.push({
                id: pageId,
                title: parsedData.pageTitle || `ZipGroup Page`,
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

      const existingPageIds = new Set(allLoadedPages.map(p => p.id));
      const validStoredOrder = initialStoredOrder.filter(id => existingPageIds.has(id));

      if (validStoredOrder.length !== initialStoredOrder.length) {
         localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(validStoredOrder));
      }

      const pageMap = new Map(allLoadedPages.map(p => [p.id, p]));
      const finalPages: StoredPage[] = [];
      const processedIds = new Set<string>();

      for (const id of validStoredOrder) {
        const page = pageMap.get(id);
        if (page) {
          finalPages.push(page);
          processedIds.add(id);
        }
      }

      const remainingPages = allLoadedPages
        .filter(p => !processedIds.has(p.id))
        .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0) || a.title.localeCompare(b.title));

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
    root.classList.add(dashboardThemeMode);
    if (dashboardCustomPrimaryColor) {
      const hslValues = hexToHslValues(dashboardCustomPrimaryColor);
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
  }, [dashboardThemeMode, dashboardCustomPrimaryColor, isThemeLoading]);

  const handleCreateNewPage = () => {
    createNewBlankPageAndRedirect();
  };

  const handleDeletePage = (idToDelete: string) => {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}${idToDelete}`);
      setPages(prevPages => {
        const newPages = prevPages.filter(p => p.id !== idToDelete);
        const newOrder = newPages.map(p => p.id);
        localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(newOrder));
        return newPages;
      });
      toast({
        title: "Page Deleted",
        description: `The page "${pages.find(p => p.id === idToDelete)?.title || idToDelete}" has been removed.`,
      });
    } catch (error) {
      console.error("Failed to delete page:", error);
      toast({ title: "Error", description: "Could not delete the page.", variant: "destructive" });
    }
  };

  const handleSharePage = async (id: string) => {
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}${id}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { lastModified, ...shareableData } = parsedData;
        const jsonString = JSON.stringify(shareableData);
        const encodedJson = encodeURIComponent(jsonString);
        const shareUrl = `${window.location.origin}/?sharedData=${encodedJson}`;
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
      toast({ title: "Share Failed", description: "Could not create or copy the share link.", variant: "destructive" });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndPages = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setPages((currentPages) => {
        const oldIndex = currentPages.findIndex((p) => p.id === active.id);
        const newIndex = currentPages.findIndex((p) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return currentPages;
        const reorderedPages = arrayMove(currentPages, oldIndex, newIndex);
        const newOrderOfIds = reorderedPages.map(p => p.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(newOrderOfIds));
        }
        return reorderedPages;
      });
    }
  };
  
  return (
    <TooltipProvider delayDuration={100}>
      {isLoadingData ? (
        <div className="min-h-screen flex flex-col">
           <AppHeader
              onCreateNewPage={handleCreateNewPage}
              customPrimaryColor={dashboardCustomPrimaryColor}
              onSetCustomPrimaryColor={setDashboardCustomPrimaryColor}
              themeMode={dashboardThemeMode}
              onSetThemeMode={setDashboardThemeMode}
              showHomePageLink={false}
              showSamplePageLink={true}
              showShareButton={false}
          />
          <main className="flex-grow container mx-auto p-4 md:p-8">
            <PageContentSpinner text="Loading your ZipGroup home..." />
          </main>
          <AppFooter onCreateNewPage={handleCreateNewPage} />
        </div>
      ) : (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <AppHeader
              onCreateNewPage={handleCreateNewPage}
              customPrimaryColor={dashboardCustomPrimaryColor}
              onSetCustomPrimaryColor={setDashboardCustomPrimaryColor}
              themeMode={dashboardThemeMode}
              onSetThemeMode={setDashboardThemeMode}
              showHomePageLink={false}
              showSamplePageLink={true}
              showShareButton={false}
          />
          <main className="flex-grow container mx-auto p-4 md:p-8">
            {pages.length === 0 ? (
              <EmptyStateMessage
                icon={<PageHomeIcon className="h-16 w-16" />}
                title="No ZipGroup Pages Yet"
                description="Looks like your home page is empty. Let's create your first page!"
                actions={
                  <>
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
                  </>
                }
              />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndPages}>
                <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {pages.map(page => (
                      <SortablePageCardItem
                        key={page.id}
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
      )}
    </TooltipProvider>
  );
}


    