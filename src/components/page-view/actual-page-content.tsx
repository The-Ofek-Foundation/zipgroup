
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { LinkGroupList } from "@/components/link-group/link-group-list";
import { LinkGroupFormDialog } from "@/components/link-group/link-group-form-dialog";
import type { LinkGroup, AppData } from "@/lib/types";
import { useAppData } from "@/hooks/use-app-data";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Info, Save, Loader2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { format } from 'date-fns';
import Link from "next/link";
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

export function ActualPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [initialSharedData, setInitialSharedData] = useState<Partial<AppData> | undefined>(undefined);
  const [sharedDataProcessed, setSharedDataProcessed] = useState(false);


  useEffect(() => {
    // This effect specifically handles the initial parsing of 'sharedData' from URL
    if (typeof window !== 'undefined' && !sharedDataProcessed) {
      const currentUrlSearchParams = new URLSearchParams(window.location.search);
      const sharedDataParam = currentUrlSearchParams.get('sharedData');

      if (sharedDataParam && !window.location.hash) { // Only process if no hash (true shared link)
        try {
          const decodedJson = decodeURIComponent(sharedDataParam);
          const parsedData = JSON.parse(decodedJson) as AppData;
          setInitialSharedData(parsedData); // This will be passed to useAppData
          toast({
            title: "Shared Page Loaded",
            description: "You're viewing a shared page. Click 'Save This Page' to add it to your home.",
            duration: 7000,
          });
          // DO NOT Clean the URL here. Let the sharedData param persist
          // until the user saves or navigates away.
          // The router.push in createNewPageFromAppData will navigate to a clean /#hash URL.
        } catch (error) {
          console.error("Failed to parse sharedData:", error);
          toast({
            title: "Error Loading Shared Page",
            description: "The shared link seems to be invalid or corrupted.",
            variant: "destructive",
          });
           // Also do not clean URL on error, user might want to copy/debug it.
        }
      }
      setSharedDataProcessed(true); // Mark as processed even if no sharedData was found, or if an error occurred.
    }
  }, [searchParams, router, pathname, toast, sharedDataProcessed]); // Depends on searchParams

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
  } = useAppData(initialSharedData); // Pass initialSharedData here

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [localPageTitle, setLocalPageTitle] = useState("");
  const [isSavingNewPage, setIsSavingNewPage] = useState(false);

  const isPristineOrSharedPage = !currentHash && !!appData; // True if appData is loaded but there's no hash
  const isReadOnlyPreview = isPristineOrSharedPage && !!initialSharedData; // Only shared previews are read-only

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
      const sharePathname = pathname === '/sample' ? '/' : pathname;
      const shareUrl = `${window.location.origin}${sharePathname}?sharedData=${encodedJson}`;

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
    const groupIdToOpen = searchParams.get('openGroupInNewWindow');
    const urlToClearParamsFrom = currentHash ? `${pathname}#${currentHash}` : pathname;

    if (groupIdToOpen && appData && !isLoading && currentHash) {
      const group = appData.linkGroups.find(g => g.id === groupIdToOpen);
      console.log("[OpenInNewWindowEffect] Processing Group ID:", groupIdToOpen, "Found group:", group);

      // Clear URL param first
      router.replace(urlToClearParamsFrom, { scroll: false });
      console.log("[OpenInNewWindowEffect] Cleared URL param, current URL:", window.location.href);

      if (group && group.urls.length > 0) {
        toast({
          title: `Opening "${group.name}"...`,
          description: `Attempting to open ${group.urls.length} link(s). Your browser's popup blocker might prevent some links. This tab will become the first link.`,
          duration: 10000,
        });

        const [firstUrlFull, ...otherUrlsFull] = group.urls.map(normalizeUrl);
        console.log("[OpenInNewWindowEffect] First URL:", firstUrlFull, "Other URLs:", otherUrlsFull);

        otherUrlsFull.forEach(url => {
          try {
            new URL(url); // Validate
            const newTab = window.open(url, '_blank');
            if (!newTab) {
              console.warn(`[OpenInNewWindowEffect] Popup blocker might have prevented opening: ${url}`);
              toast({ title: "Popup Blocker Active?", description: `Could not open: ${url}. Please check settings.`, variant: "default", duration: 7000 });
            } else {
              console.log("[OpenInNewWindowEffect] Opened:", url);
            }
          } catch (e) {
            console.warn(`[OpenInNewWindowEffect] Invalid URL skipped: ${url}`, e);
            toast({ title: "Invalid URL", description: `Skipped invalid URL: ${url}`, variant: "destructive" });
          }
        });

        setTimeout(() => {
          try {
            new URL(firstUrlFull); // Validate
            console.log("[OpenInNewWindowEffect] Navigating current tab to:", firstUrlFull);
            window.location.replace(firstUrlFull);
          } catch (e) {
            console.error(`[OpenInNewWindowEffect] Error navigating to first URL "${firstUrlFull}":`, e);
            toast({ title: "Error with First Link", description: `The first link "${firstUrlFull}" is invalid or could not be opened. This tab will remain.`, variant: "destructive", duration: 7000 });
          }
        }, 250); // Delay to allow other tabs to open
      } else if (group && group.urls.length === 0) {
        toast({ title: "No URLs in Group", description: `The group "${group.name}" has no URLs to open.`, variant: "destructive" });
      } else if (!group) {
        toast({ title: "Group Not Found", description: `Could not find the group with ID "${groupIdToOpen}".`, variant: "destructive" });
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

  if (isLoading || !appData || !sharedDataProcessed) { // Wait for sharedData to be processed
    return null; // Or your PageSkeletonForSuspense, but null might be better to avoid flashes
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
        title: initialSharedData ? "Shared Page Saved!" : "Page Saved!",
        description: initialSharedData
          ? "The shared page is now part of your home page."
          : "This page is now saved to your home page.",
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
            showHomePageLink={true}
            showSamplePageLink={false} // Not shown on actual page content view
            showShareButton={true}
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

            {isPristineOrSharedPage && ( // This block is for unsaved pages (new blank, or shared preview)
              <div className="text-center py-6 px-4 border-b border-border mb-8 rounded-lg bg-card shadow" data-joyride="interactive-sample-info">
                <Info className="mx-auto h-10 w-10 text-primary mb-4" />
                 <h2 className="text-xl font-semibold text-foreground mb-2">
                  {initialSharedData ? "Previewing Shared Page" : "Welcome to ZipGroup!" /* This branch will be less common now as / shows dashboard */}
                </h2>
                <p className="text-md text-muted-foreground mb-6 max-w-xl mx-auto">
                  {initialSharedData
                    ? "This is a preview of a shared ZipGroup page. You can explore the links below. When you're ready, save it to your home page to make it your own."
                    : "Customize your new page's title, theme, and link groups below. When you're ready, save it to start using your new ZipGroup page!"
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
                  {initialSharedData ? "Save This Shared Page to My Home Page" : "Save This Page to My Home Page"}
                </Button>
                 {!initialSharedData && pathname !=='/sample' && ( // Show tour button for truly new pages not sample/shared
                  <Button variant="outline" size="lg" asChild className="mt-4 sm:mt-0 sm:ml-3">
                     <Link href="/sample"><HelpCircle className="mr-2 h-5 w-5" /> Quick Tour</Link>
                  </Button>
                )}
              </div>
            )}

            {/* LinkGroupList is now always rendered if appData exists, even for shared/pristine */}
            {appData && (
              isReadOnlyPreview ? (
                <LinkGroupList
                  groups={appData.linkGroups}
                  onAddGroup={handleAddGroup} // Will be disabled by isReadOnlyPreview inside LinkGroupList
                  onEditGroup={handleEditGroup} // Will be disabled by isReadOnlyPreview in LinkGroupCard
                  onDeleteGroup={handleDeleteGroup} // Will be disabled by isReadOnlyPreview in LinkGroupCard
                  onOpenGroup={handleOpenGroup}
                  onOpenInNewWindow={handleOpenGroupInNewWindow} // Will be disabled by isReadOnlyPreview in LinkGroupCard
                  isReadOnlyPreview={true}
                />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndLinkGroups}
                  disabled={isReadOnlyPreview} // Should be false here
                >
                  <SortableContext
                    items={appData.linkGroups.map(g => g.id)}
                    strategy={rectSortingStrategy}
                    disabled={isReadOnlyPreview} // Should be false here
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
          <AppFooter onCreateNewPage={createNewBlankPageAndRedirect} />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

