
"use client";

import type React from "react";
import { useState, useEffect, Suspense, useCallback } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { LinkGroupList } from "@/components/link-group/link-group-list";
import { LinkGroupFormDialog } from "@/components/link-group/link-group-form-dialog";
import type { LinkGroup, AppData } from "@/lib/types";
import { useAppData } from "@/hooks/use-app-data";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardCopy, Save, Loader2, Info, Share2, Clock } from "lucide-react";
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
} from '@dnd-kit/sortable';
import { normalizeUrl } from "@/lib/utils";


// This component will render the actual page content if there's a hash or shared data
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
      if (sharedDataParam && !window.location.hash) { // Ensure no hash when processing shared data
        try {
          const decodedJson = decodeURIComponent(sharedDataParam);
          const parsedData = JSON.parse(decodedJson) as AppData;
          setInitialSharedData(parsedData);
          toast({
            title: "Shared Page Loaded",
            description: "You're viewing a shared page. Click 'Save This Page' to add it to your dashboard.",
            duration: 7000,
          });
          // Clear the sharedData param from URL without affecting hash or other params
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
           // Clear the sharedData param from URL
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
    // createNewBlankPageAndRedirect is now mainly for AppHeader "New Page" from an existing page
    createNewBlankPageAndRedirect,
    currentHash,
    setCustomPrimaryColor,
  } = useAppData(initialSharedData);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [localPageTitle, setLocalPageTitle] = useState("");
  const [isSavingNewPage, setIsSavingNewPage] = useState(false);


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

  const handleCopyPageUrl = async () => {
    if (!currentHash) {
      toast({
        title: "Error",
        description: "Page URL not available until the page is saved.",
        variant: "destructive",
      });
      return;
    }
    try {
      const pageUrl = `${window.location.origin}${pathname}#${currentHash}`;
      await navigator.clipboard.writeText(pageUrl);
      toast({
        title: "URL Copied!",
        description: "The page URL has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy URL: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy the URL to your clipboard.",
        variant: "destructive",
      });
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

  const handleOpenNewPageInNewTab = () => {
    // This function is for the footer link. It should always open a new, blank page.
    const newUrl = `${window.location.origin}/`; // Will trigger root redirect to a new blank page
    window.open(newUrl, '_blank');
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

    // Construct URL with query param before the hash
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
    const groupIdToOpen = searchParams.get('openGroupInNewWindow');
    // Construct the URL to clear params from, ensuring hash is included if present
    let urlToClearParamsFrom = currentHash ? `${pathname}#${currentHash}` : pathname;

    if (groupIdToOpen && appData && !isLoading && currentHash) {
      console.log("[OpenInNewWindowEffect] Processing group ID:", groupIdToOpen, "with hash:", currentHash);
      const group = appData.linkGroups.find(g => g.id === groupIdToOpen);
      
      if (group && group.urls.length > 0) {
        toast({
          title: `Opening "${group.name}"...`,
          description: `Attempting to open ${group.urls.length} link(s). IMPORTANT: Your browser's popup blocker might prevent some or all links from opening. This tab will become the first link.`,
          duration: 10000,
        });
        console.log("[OpenInNewWindowEffect] Found group:", group.name, "with URLs:", group.urls);

        // Clear query param first.
        // The target URL for clearing should be the base path + hash.
        const cleanPathWithHash = currentHash ? `${pathname}#${currentHash}` : pathname;
        router.replace(cleanPathWithHash, { scroll: false });
        console.log("[OpenInNewWindowEffect] Cleared query param, new URL target:", cleanPathWithHash);


        const [firstUrl, ...otherUrls] = group.urls.map(normalizeUrl);

        otherUrls.forEach(url => {
          try {
            new URL(url); // Validate URL
            const newTab = window.open(url, '_blank');
            if (!newTab) {
              console.warn(`[OpenInNewWindowEffect] Popup blocker might have prevented opening: ${url}`);
              toast({ title: "Popup Blocker Active?", description: `Could not open: ${url}. Please check your popup blocker settings.`, variant: "default", duration: 7000 });
            } else {
               console.log("[OpenInNewWindowEffect] Opened in new tab:", url);
            }
          } catch (e) {
            console.warn(`[OpenInNewWindowEffect] Invalid URL skipped: ${url}`, e);
            toast({ title: "Invalid URL", description: `Skipped invalid URL: ${url}`, variant: "destructive" });
          }
        });

        setTimeout(() => {
          try {
            new URL(firstUrl); // Validate first URL
            console.log("[OpenInNewWindowEffect] Attempting to replace current tab with first URL:", firstUrl);
            window.location.replace(firstUrl);
          } catch (e) {
            console.error(`[OpenInNewWindowEffect] Error navigating to first URL "${firstUrl}":`, e);
            toast({ title: "Error with First Link", description: `The first link "${firstUrl}" is invalid or could not be opened. This tab will remain on a clean URL.`, variant: "destructive", duration: 7000 });
            // If first URL navigation fails, the URL is already cleaned.
          }
        }, 250); // Short delay to allow other tabs to initiate opening
      } else if (group && group.urls.length === 0) {
        console.warn("[OpenInNewWindowEffect] Group found but has no URLs:", group.name);
        toast({ title: "No URLs in Group", description: `The group "${group.name}" has no URLs to open.`, variant: "destructive" });
        const cleanPathWithHash = currentHash ? `${pathname}#${currentHash}` : pathname;
        router.replace(cleanPathWithHash, { scroll: false });
      } else if (!group) { // Corrected condition: if group is undefined
        console.warn("[OpenInNewWindowEffect] Group not found for ID:", groupIdToOpen);
        toast({ title: "Group Not Found", description: `Could not find the group with ID "${groupIdToOpen}".`, variant: "destructive" });
        const cleanPathWithHash = currentHash ? `${pathname}#${currentHash}` : pathname;
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

  const isSharedPreview = !currentHash && appData && !!initialSharedData;
  const isReadOnlyPreview = isSharedPreview; // Only shared page previews are read-only for now.

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

  const handleSaveCurrentDataAsNewPage = async () => { // Renamed for clarity
    setIsSavingNewPage(true);
    // createNewPageFromAppData is designed to save current appData (whether pristine or shared)
    const newHash = createNewPageFromAppData(); 
    if (newHash) {
      toast({
        title: isSharedPreview ? "Shared Page Saved!" : "Page Saved!",
        description: isSharedPreview 
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
            onCreateNewPage={createNewBlankPageAndRedirect} // Standard "New Page" creates a blank one
            customPrimaryColor={appData.customPrimaryColor}
            onSetCustomPrimaryColor={setCustomPrimaryColor}
            isReadOnlyPreview={isReadOnlyPreview}
            onInitiateShare={handleShareCurrentPage}
            canShareCurrentPage={!!currentHash && !isSharedPreview}
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

            {isSharedPreview && (
              <div
                className="text-center py-6 px-4 border-b border-border mb-8 rounded-lg bg-card shadow"
                data-joyride="interactive-sample-info" 
              >
                <Info className="mx-auto h-10 w-10 text-primary mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Previewing Shared Page
                </h2>
                <p className="text-md text-muted-foreground mb-6 max-w-xl mx-auto">
                  This is a preview of a shared ZipGroup page. You can explore the links below. When you're ready, save it to your dashboard to make it your own.
                </p>
                <Button
                  onClick={handleSaveCurrentDataAsNewPage}
                  size="lg"
                  disabled={isSavingNewPage}
                  data-joyride="save-pristine-page-button" 
                >
                  {isSavingNewPage ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  Save This Shared Page to My Dashboard
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Saving will create a new copy in your dashboard, allowing you to edit and manage it.
                </p>
              </div>
            )}
            
            {/* Render LinkGroupList if not a pristine page OR if it's a shared preview */}
            {/* This ensures shared previews show their groups. */}
            {/* If it's a pristine page that's now blank (redirected), this will show "Add New Group" button */}
            {(currentHash || isSharedPreview) && appData && (
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
                onClick={handleOpenNewPageInNewTab}
                className="p-0 h-auto text-sm font-normal text-muted-foreground hover:text-primary"
              >
                ZipGroup.link
              </Button>
              {currentHash && (
                <>
                  <span className="hidden sm:inline">. Your current page hash:</span>
                  <span className="sm:hidden">. Hash:</span>
                  <code className="font-mono bg-muted p-1 rounded text-xs">{currentHash}</code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleCopyPageUrl} aria-label="Copy page URL" className="h-6 w-6">
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy page URL</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </footer>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

// This component handles the root path redirection or renders ActualPageContent.
function RootRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { createNewBlankPageAndRedirect, isLoading: appDataIsLoading, appData } = useAppData();
  const [isRedirecting, setIsRedirecting] = useState(true); // Start assuming redirect might happen

  useEffect(() => {
    // Ensure router is ready and we are on the client
    if (typeof window !== 'undefined' && router && !appDataIsLoading) {
      const hasHash = !!window.location.hash; // Check hash client-side
      const hasSharedData = !!searchParams.get('sharedData');
      const shouldRedirect = pathname === '/' && !hasHash && !hasSharedData;
      
      if (shouldRedirect) {
        console.log("RootRedirector: Attempting to redirect to new blank page...");
        createNewBlankPageAndRedirect();
        // isRedirecting remains true; page will show skeleton until redirect completes.
      } else {
        // console.log("RootRedirector: Not redirecting. Path:", pathname, "Hash:", window.location.hash, "SharedData:", searchParams.get('sharedData'));
        setIsRedirecting(false); // Conditions for redirect not met, allow content render
      }
    }
  }, [router, searchParams, pathname, createNewBlankPageAndRedirect, appDataIsLoading, appData]);

  if (isRedirecting) { // This will be true initially, and if a redirect is initiated.
    return <PageSkeletonForSuspense />;
  }
  return <ActualPageContent />;
}


function PageSkeletonForSuspense() {
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

export default function Home() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <RootRedirector />
    </Suspense>
  );
}

