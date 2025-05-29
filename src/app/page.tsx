
"use client";

import type React from "react";
import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { LinkGroupList } from "@/components/link-group/link-group-list";
import { LinkGroupFormDialog } from "@/components/link-group/link-group-form-dialog";
import type { LinkGroup, AppData } from "@/lib/types";
import { useAppData } from "@/hooks/use-app-data";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCopy, Save, Loader2, Info, Share2, Clock, Home as HomeIcon, PlusCircle, Trash2, Layers, SunMoon, Palette, FileText, BookOpenCheck, HelpCircle } from "lucide-react"; // Renamed Home to HomeIcon
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
import { normalizeUrl, cn } from "@/lib/utils";
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CustomColorPicker } from "@/components/theme/custom-color-picker";
import { hexToHslValues } from "@/lib/color-utils";


// --- Start of logic moved from src/app/dashboard/page.tsx ---
const LOCAL_STORAGE_PREFIX_DASHBOARD = "linkwarp_"; // Using existing prefix
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";
// Dashboard theme keys are managed by useDashboardTheme hook

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
    // Only stop propagation if not read-only, to allow dnd-kit activation constraints to work for dialogs
    // For dashboard items, they are always "editable" in terms of their cards being interactive.
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-manipulation",
        isDragging ? "z-50 opacity-75 shadow-2xl ring-2 ring-primary cursor-grabbing" : "z-auto cursor-grab"
      )}
      {...attributes} // Apply dnd-kit attributes here
      {...listeners}  // Apply dnd-kit listeners here
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
          <TooltipProvider delayDuration={100}>
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

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      aria-label={`Delete page ${page.title}`}
                      onPointerDown={stopPropagationForEvents} // Important for draggable context
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete page</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete the page <strong className="mx-1">{page.title}</strong> (hash: {page.hash}) and all its link groups.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => { onDelete(page.hash); setIsDeleteDialogOpen(false); }}
                  >
                    Delete Page
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TooltipProvider>
        </CardFooter>
      </Card>
    </div>
  );
}

function DashboardView() {
  const [pages, setPages] = useState<StoredPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { createNewBlankPageAndRedirect } = useAppData(); // For "Create New Page" button

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
      } catch (error) {
        console.error("Failed to parse page order from local storage:", error);
        initialStoredOrder = [];
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.startsWith(LOCAL_STORAGE_PREFIX_DASHBOARD) &&
          key !== DASHBOARD_ORDER_KEY &&
          key !== 'linkwarp_dashboard_theme_mode' && // Explicitly skip dashboard theme keys
          key !== 'linkwarp_dashboard_custom_primary_color'
        ) {
          try {
            const storedData = localStorage.getItem(key);
            if (storedData) {
              const parsedData = JSON.parse(storedData) as AppData;
              const hash = key.substring(LOCAL_STORAGE_PREFIX_DASHBOARD.length);

              if (!parsedData.linkGroups || parsedData.linkGroups.length === 0) {
                localStorage.removeItem(key);
                initialStoredOrder = initialStoredOrder.filter(h => h !== hash);
                continue;
              }

              allLoadedPages.push({
                hash: hash,
                title: parsedData.pageTitle || `ZipGroup Page ${hash}`,
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

      // Sort remaining (unordered) pages by lastModified (newest first), then title
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
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl text-muted-foreground">Loading your ZipGroup dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <HomeIcon className="mr-2 h-6 w-6 text-primary" /> {/* Use aliased HomeIcon */}
            <h1 className="text-2xl font-semibold text-primary">ZipGroup Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateNewPage} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Page
            </Button>
             <Button variant="outline" size="sm" asChild>
              <Link href="/sample">
                <BookOpenCheck className="mr-2 h-4 w-4" />
                View Sample
              </Link>
            </Button>
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
              Looks like your dashboard is empty. Let's create your first page!
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
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Found {pages.length} page(s) with link groups. Manage your ZipGroup configurations with ease.
      </footer>
    </div>
  );
}
// --- End of logic moved from src/app/dashboard/page.tsx ---


// --- Start of ActualPageContent (for /#HASH pages) ---
function ActualPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [initialSharedData, setInitialSharedData] = useState<Partial<AppData> | undefined>(undefined);
  const [sharedDataProcessed, setSharedDataProcessed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !sharedDataProcessed) {
      const sharedDataParam = searchParams.get('sharedData');
      if (sharedDataParam && !window.location.hash) {
        try {
          const decodedJson = decodeURIComponent(sharedDataParam);
          const parsedData = JSON.parse(decodedJson) as AppData;
          setInitialSharedData(parsedData);
          toast({
            title: "Shared Page Loaded",
            description: "You're viewing a shared page. Click 'Save This Page' to add it to your dashboard.",
            duration: 7000,
          });
          // Clear the sharedData param from URL after processing
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('sharedData');
          router.replace(currentUrl.pathname + currentUrl.search + currentUrl.hash, { scroll: false });

        } catch (error) {
          console.error("Failed to parse sharedData:", error);
          toast({
            title: "Error Loading Shared Page",
            description: "The shared link seems to be invalid or corrupted.",
            variant: "destructive",
          });
           const currentUrl = new URL(window.location.href);
           currentUrl.searchParams.delete('sharedData');
           router.replace(currentUrl.pathname + currentUrl.search + currentUrl.hash, { scroll: false });
        }
      }
      setSharedDataProcessed(true); // Mark as processed even if no sharedData was found
    }
  }, [searchParams, router, pathname, toast, sharedDataProcessed]);

  const {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    createNewPageFromAppData,
    currentHash,
    setCustomPrimaryColor,
    createNewBlankPageAndRedirect, 
  } = useAppData(initialSharedData);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [localPageTitle, setLocalPageTitle] = useState("");
  const [isSavingNewPage, setIsSavingNewPage] = useState(false);

  const isPristineOrSharedPage = !currentHash && !!appData;
  const isReadOnlyPreview = isPristineOrSharedPage && !!initialSharedData; 

  useEffect(() => {
    if (appData?.pageTitle) {
      document.title = appData.pageTitle;
      setLocalPageTitle(appData.pageTitle);
    }
  }, [appData?.pageTitle]);

  const handlePageTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPageTitle(event.target.value);
  };

  const handlePageTitleBlur = () => {
    if (appData && localPageTitle !== appData.pageTitle) {
      setPageTitle(localPageTitle);
    }
  };

  const handlePageTitleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (appData && localPageTitle !== appData.pageTitle) {
        setPageTitle(localPageTitle);
      }
      (event.target as HTMLInputElement).blur();
    }
  };

  const handleShareCurrentPage = async () => {
    if (!currentHash || !appData) {
      toast({
        title: "Cannot Share",
        description: "Please save the page first to enable sharing.",
        variant: "default",
      });
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { lastModified, ...shareableData } = appData;
      const jsonString = JSON.stringify(shareableData);
      const encodedJson = encodeURIComponent(jsonString);
      const shareUrl = `${window.location.origin}${pathname}?sharedData=${encodedJson}`;

      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Share Link Copied!",
        description: "The link to share this page has been copied to your clipboard.",
        duration: 7000,
      });
    } catch (error) {
      console.error("Failed to create share link for current page:", error);
      toast({
        title: "Share Failed",
        description: "Could not create or copy the share link.",
        variant: "destructive",
      });
    }
  };
  
  const handleOpenGroupInNewWindow = async (groupToOpen: LinkGroup) => {
    if (!currentHash) {
      toast({ title: "Error", description: "Current page details not available to create the link.", variant: "destructive" });
      return;
    }
    if (groupToOpen.urls.length === 0) {
      toast({ title: "No URLs", description: "This group has no URLs to open.", variant: "default" });
      return;
    }

    const url = `${window.location.origin}${pathname}?openGroupInNewWindow=${groupToOpen.id}#${currentHash}`;

    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied for New Window!",
        description: (
          <div className="text-sm">
            <p className="mb-2">A special link to open this group in a new window has been copied to your clipboard:</p>
            <ol className="list-decimal list-inside space-y-1 my-2">
              <li>Manually open a new browser window.</li>
              <li>Paste the copied link into the address bar.</li>
              <li>Press Enter.</li>
            </ol>
            <p className="mt-2">The new window will then open all links from the group "{groupToOpen.name}".</p>
            <p className="mt-1 text-xs text-muted-foreground">Ensure your browser allows popups from this site.</p>
          </div>
        ),
        duration: 15000,
      });
    } catch (err) {
      console.error("Failed to copy special URL for new window: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy the special link for the new window.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const queryGroupIdToOpen = searchParams.get('openGroupInNewWindow');
    const cleanPathWithHash = currentHash ? `${pathname}#${currentHash}` : pathname;

    if (queryGroupIdToOpen && appData && !isLoading && currentHash) {
      const group = appData.linkGroups.find(g => g.id === queryGroupIdToOpen);
      
      if (group && group.urls.length > 0) {
        toast({
          title: `Opening "${group.name}"...`,
          description: `Attempting to open ${group.urls.length} link(s). Your browser's popup blocker might prevent some links. This tab will become the first link.`,
          duration: 10000,
        });
        
        router.replace(cleanPathWithHash, { scroll: false }); 

        const [firstUrlFull, ...otherUrlsFull] = group.urls.map(normalizeUrl);

        otherUrlsFull.forEach(url => {
          try {
            new URL(url); 
            const newTab = window.open(url, '_blank');
            if (!newTab) {
              console.warn(`[OpenInNewWindowEffect] Popup blocker might have prevented opening: ${url}`);
              toast({ title: "Popup Blocker Active?", description: `Could not open: ${url}. Please check settings.`, variant: "default", duration: 7000 });
            }
          } catch (e) {
            console.warn(`[OpenInNewWindowEffect] Invalid URL skipped: ${url}`, e);
            toast({ title: "Invalid URL", description: `Skipped invalid URL: ${url}`, variant: "destructive" });
          }
        });

        setTimeout(() => {
          try {
            new URL(firstUrlFull); 
            window.location.replace(firstUrlFull);
          } catch (e) {
            console.error(`[OpenInNewWindowEffect] Error navigating to first URL "${firstUrlFull}":`, e);
            toast({ title: "Error with First Link", description: `The first link "${firstUrlFull}" is invalid or could not be opened. This tab will remain.`, variant: "destructive", duration: 7000 });
          }
        }, 250); 
      } else if (group && group.urls.length === 0) {
        toast({ title: "No URLs in Group", description: `The group "${group.name}" has no URLs to open.`, variant: "destructive" });
        router.replace(cleanPathWithHash, { scroll: false });
      } else if (!group) { 
        toast({ title: "Group Not Found", description: `Could not find the group with ID "${queryGroupIdToOpen}".`, variant: "destructive" });
        router.replace(cleanPathWithHash, { scroll: false });
      }
    }
 }, [searchParams, appData, isLoading, currentHash, pathname, router, toast]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndLinkGroups = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id && appData) {
      const oldIndex = appData.linkGroups.findIndex((g) => g.id === active.id);
      const newIndex = appData.linkGroups.findIndex((g) => g.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedGroups = arrayMove(appData.linkGroups, oldIndex, newIndex);
        setLinkGroups(reorderedGroups);
      }
    }
  };

  if (isLoading || !appData || !sharedDataProcessed) {
    return <PageSkeletonForSuspense />;
  }

  const handleAddGroup = () => {
    setEditingGroup(null);
    setIsFormOpen(true);
  };

  const handleEditGroup = (group: LinkGroup) => {
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const handleDeleteGroup = (groupToDelete: LinkGroup) => {
    const updatedGroups = appData.linkGroups.filter(g => g.id !== groupToDelete.id);
    setLinkGroups(updatedGroups);
    toast({ title: "Group Deleted", description: `"${groupToDelete.name}" has been removed.` });
  };

  const handleOpenGroup = (group: LinkGroup) => { /* For toast in LinkGroupCard */ };

  const handleFormSubmit = (groupData: LinkGroup) => {
    const existingGroupIndex = appData.linkGroups.findIndex(g => g.id === groupData.id);
    let updatedGroups;
    if (existingGroupIndex > -1) {
      updatedGroups = [...appData.linkGroups];
      updatedGroups[existingGroupIndex] = groupData;
      toast({ title: "Group Updated", description: `"${groupData.name}" has been saved.` });
    } else {
      updatedGroups = [...appData.linkGroups, groupData];
      toast({ title: "Group Created", description: `"${groupData.name}" has been added.` });
    }
    setLinkGroups(updatedGroups);
    setIsFormOpen(false);
  };

  const handleSaveCurrentDataAsNewPage = async () => { 
    setIsSavingNewPage(true);
    const newHash = createNewPageFromAppData(); 
    if (newHash) {
      toast({
        title: isPristineOrSharedPage && initialSharedData ? "Shared Page Saved!" : "Page Saved!",
        description: isPristineOrSharedPage && initialSharedData 
          ? "The shared page is now part of your dashboard." 
          : "This page is now saved to your dashboard.",
      });
    } else {
      toast({
        title: "Save Failed",
        description: "Could not save the page. Please try again.",
        variant: "destructive",
      });
    }
    setIsSavingNewPage(false);
  };

  return (
    <ThemeProvider
      appData={appData}
      onThemeChange={setTheme}
    >
      <TooltipProvider delayDuration={100}>
        <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
          <AppHeader
            onCreateNewPage={createNewBlankPageAndRedirect}
            customPrimaryColor={appData.customPrimaryColor}
            onSetCustomPrimaryColor={setCustomPrimaryColor}
            isReadOnlyPreview={isReadOnlyPreview}
            onInitiateShare={handleShareCurrentPage}
            canShareCurrentPage={!!currentHash && !isReadOnlyPreview}
          />
          <main className="flex-grow container mx-auto p-4 md:p-8">
            <div className="mb-6 text-center">
              <Input
                type="text"
                value={localPageTitle}
                onChange={handlePageTitleChange}
                onBlur={handlePageTitleBlur}
                onKeyPress={handlePageTitleKeyPress}
                className="w-full max-w-2xl mx-auto text-3xl md:text-4xl font-bold bg-transparent border-0 border-b-2 border-transparent focus:border-primary shadow-none focus-visible:ring-0 text-center py-2 h-auto"
                placeholder="Enter Page Title"
                aria-label="Page Title"
                disabled={isReadOnlyPreview}
                data-joyride="page-title-input" 
              />
              {currentHash && appData.lastModified && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center">
                  <Clock className="mr-1.5 h-3 w-3" />
                  Last modified: {format(new Date(appData.lastModified), "MMM d, yyyy, h:mm a")}
                </p>
              )}
            </div>
            
            {isPristineOrSharedPage && (
              <div className="text-center py-6 px-4 border-b border-border mb-8 rounded-lg bg-card shadow" data-joyride="interactive-sample-info">
                <Info className="mx-auto h-10 w-10 text-primary mb-4" />
                 <h2 className="text-xl font-semibold text-foreground mb-2">
                  {initialSharedData ? "Previewing Shared Page" : "Welcome to ZipGroup!"}
                </h2>
                <p className="text-md text-muted-foreground mb-6 max-w-xl mx-auto">
                  {initialSharedData 
                    ? "This is a preview of a shared ZipGroup page. You can explore the links below. When you're ready, save it to your dashboard to make it your own."
                    : "You're viewing a fully interactive starting page. Customize the title, theme, and link groups below. When you're ready, save it to your dashboard to make it your own!"
                  }
                </p>
                <Button
                  onClick={handleSaveCurrentDataAsNewPage}
                  size="lg"
                  disabled={isSavingNewPage}
                  data-joyride={initialSharedData ? "save-shared-page-button" : "save-pristine-page-button"}
                >
                  {isSavingNewPage ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  {initialSharedData ? "Save This Shared Page to My Dashboard" : "Save This Page to My Dashboard"}
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Saving will create a new copy in your dashboard, allowing you to edit and manage it.
                </p>
                 {!initialSharedData && ( // Only show Quick Tour for pristine sample page
                  <Button variant="outline" size="lg" onClick={() => { /* TODO: Implement or connect tour start */ }} className="mt-4 ml-3">
                     <HelpCircle className="mr-2 h-5 w-5" /> Quick Tour
                  </Button>
                )}
              </div>
            )}
            
            {appData && ( // Always render LinkGroupList if appData exists
              isReadOnlyPreview ? (
                <LinkGroupList
                  groups={appData.linkGroups}
                  onAddGroup={handleAddGroup}
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onOpenGroup={handleOpenGroup}
                  onOpenInNewWindow={handleOpenGroupInNewWindow}
                  isReadOnlyPreview={true}
                />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndLinkGroups}
                >
                  <SortableContext
                    items={appData.linkGroups.map(g => g.id)}
                    strategy={rectSortingStrategy}
                  >
                    <LinkGroupList
                      groups={appData.linkGroups}
                      onAddGroup={handleAddGroup}
                      onEditGroup={handleEditGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onOpenGroup={handleOpenGroup}
                      onOpenInNewWindow={handleOpenGroupInNewWindow}
                      isReadOnlyPreview={false}
                    />
                  </SortableContext>
                </DndContext>
              )
            )}

          </main>
          <LinkGroupFormDialog
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleFormSubmit}
            initialData={editingGroup}
          />
          <footer className="py-6 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-1 flex-wrap px-2">
              <span>Powered by </span>
              <Button
                variant="link"
                onClick={createNewBlankPageAndRedirect}
                className="p-0 h-auto text-sm font-normal text-muted-foreground hover:text-primary"
              >
                ZipGroup.link
              </Button>
              <span> by Ofek Gila & Gemini</span>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 inline-block align-middle mx-1">
                <path d="M12.586 3.707a1 1 0 00-1.172 0L8.068 7.5H4.5a1 1 0 000 2h3.568l-3.346 3.683a1 1 0 00.604 1.635h3.47L4.302 19.29a1 1 0 101.48 1.342L9.5 16.5h5l3.718 4.132a1 1 0 101.48-1.342l-4.494-4.493h3.47a1 1 0 00.605-1.635L15.432 9.5h3.568a1 1 0 000-2h-3.568l-3.346-3.793zM11 14.5V9.317l2-2.286v7.469h-2z"></path>
              </svg>
            </div>
          </footer>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
// --- End of ActualPageContent ---


function PageSkeletonForSuspense() {
  // Re-using the more detailed skeleton from the old page.tsx
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between p-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="mb-8 text-center">
          <Skeleton className="h-12 w-3/4 mx-auto md:w-1/2" />
        </div>
        <div className="flex justify-center mb-10">
           <Skeleton className="h-12 w-64" />
        </div>
        <div className="text-center">
          <Skeleton className="h-5 w-1/2 mx-auto mb-2" />
          <Skeleton className="h-5 w-2/3 mx-auto" />
        </div>
      </main>
    </div>
  );
}

function PageRouter() {
  const searchParams = useSearchParams();
  const [renderMode, setRenderMode] = useState<'loading' | 'dashboard' | 'page'>('loading');
  const [clientSideCheckDone, setClientSideCheckDone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1).split('?')[0];
      const sharedData = searchParams.get('sharedData');
      if (!hash && !sharedData) {
        setRenderMode('dashboard');
      } else {
        setRenderMode('page');
      }
      setClientSideCheckDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to check initial URL state. searchParams might change but hash needs manual check.

  if (!clientSideCheckDone) {
    return <PageSkeletonForSuspense />;
  }

  if (renderMode === 'dashboard') {
    return <DashboardView />;
  }
  // renderMode === 'page' or 'loading' (if client check not done but somehow bypassed)
  return <ActualPageContent />;
}

export default function Home() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <PageRouter />
    </Suspense>
  );
}

    