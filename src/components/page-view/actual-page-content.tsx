
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Clock, Info, Save, Loader2, HelpCircle, Trash2 } from "lucide-react";
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
    if (typeof window !== 'undefined' && !sharedDataProcessed) {
      const currentUrlSearchParams = new URLSearchParams(window.location.search);
      const sharedDataParam = currentUrlSearchParams.get('sharedData');

      if (sharedDataParam && !window.location.hash) { 
        try {
          const decodedJson = decodeURIComponent(sharedDataParam);
          const parsedData = JSON.parse(decodedJson) as AppData;
          setInitialSharedData(parsedData);
          toast({
            title: "Shared Page Loaded",
            description: "You're viewing a shared page. Click 'Save This Page' to add it to your home.",
            duration: 7000,
          });
          // Do not clean the URL here. Let sharedData param persist until save or navigation.
        } catch (error) {
          console.error("Failed to parse sharedData:", error);
          toast({
            title: "Error Loading Shared Page",
            description: "The shared link seems to be invalid or corrupted.",
            variant: "destructive",
          });
        }
      }
      setSharedDataProcessed(true); 
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
    deleteCurrentPageAndRedirect,
  } = useAppData(initialSharedData); 

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [localPageTitle, setLocalPageTitle] = useState("");
  const [isSavingNewPage, setIsSavingNewPage] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const isPristineUnsavedPage = !currentHash && !initialSharedData; // True for a brand new page (not /sample) before first save
  const isSharedPagePreview = !currentHash && !!initialSharedData;  // True for a shared link preview before saving
  const isReadOnlyPreview = isSharedPagePreview; // Only shared previews are truly read-only for editing content

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
      const shareUrl = `${window.location.origin}${pathname}?sharedData=${encodedJson}`; // No hash in share URL

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
    const currentUrlSearchParams = new URLSearchParams(window.location.search);
    const groupIdToOpen = currentUrlSearchParams.get('openGroupInNewWindow');
    const urlToClearParamsFrom = currentHash ? `${pathname}#${currentHash}` : pathname;

    if (groupIdToOpen && appData && !isLoading && currentHash) {
      const group = appData.linkGroups.find(g => g.id === groupIdToOpen);
      console.log("[OpenInNewWindowEffect] Processing Group ID:", groupIdToOpen, "Found group:", group);

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
            new URL(url); 
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
            new URL(firstUrlFull); 
            console.log("[OpenInNewWindowEffect] Navigating current tab to:", firstUrlFull);
            window.location.replace(firstUrlFull);
          } catch (e) {
            console.error(`[OpenInNewWindowEffect] Error navigating to first URL "${firstUrlFull}":`, e);
            toast({ title: "Error with First Link", description: `The first link "${firstUrlFull}" is invalid or could not be opened. This tab will remain.`, variant: "destructive", duration: 7000 });
          }
        }, 250); 
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

  if (isLoading || !appData || !sharedDataProcessed) { 
    return null; 
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
        title: isSharedPagePreview ? "Shared Page Saved!" : "Page Saved!",
        description: isSharedPagePreview
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

  const handleDeletePageConfirmed = () => {
    if (deleteCurrentPageAndRedirect) {
      deleteCurrentPageAndRedirect();
    }
    setIsDeleteDialogOpen(false);
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
            showSamplePageLink={false} 
            showShareButton={true}
            onInitiateDelete={() => setIsDeleteDialogOpen(true)}
            canDeleteCurrentPage={!!currentHash && !isReadOnlyPreview}
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

            {(isPristineUnsavedPage || isSharedPagePreview) && ( 
              <div className="text-center py-6 px-4 border-b border-border mb-8 rounded-lg bg-card shadow" data-joyride="interactive-sample-info">
                <Info className="mx-auto h-10 w-10 text-primary mb-4" />
                 <h2 className="text-xl font-semibold text-foreground mb-2">
                  {isSharedPagePreview ? "Previewing Shared Page" : "Welcome to ZipGroup!"}
                </h2>
                <p className="text-md text-muted-foreground mb-6 max-w-xl mx-auto">
                  {isSharedPagePreview
                    ? "This is a preview of a shared ZipGroup page. You can explore the links below. When you're ready, save it to your home page to make it your own."
                    : "Customize your new page's title, theme, and link groups below. When you're ready, save it to start using your new ZipGroup page!"
                  }
                </p>
                <Button
                  onClick={handleSaveCurrentDataAsNewPage}
                  size="lg"
                  disabled={isSavingNewPage}
                  data-joyride={isSharedPagePreview ? "save-shared-page-button" : "save-pristine-page-button"}
                >
                  {isSavingNewPage ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  {isSharedPagePreview ? "Save This Shared Page to My Home Page" : "Save This Page to My Home Page"}
                </Button>
                 {isPristineUnsavedPage && pathname !=='/sample' && ( 
                  <Button variant="outline" size="lg" asChild className="mt-4 sm:mt-0 sm:ml-3">
                     <Link href="/sample"><HelpCircle className="mr-2 h-5 w-5" /> Quick Tour</Link>
                  </Button>
                )}
              </div>
            )}

            {appData && (
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
                  disabled={isReadOnlyPreview} 
                >
                  <SortableContext
                    items={appData.linkGroups.map(g => g.id)}
                    strategy={rectSortingStrategy}
                    disabled={isReadOnlyPreview} 
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
          <ConfirmationDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            title="Delete Page?"
            description={
              <>
                Are you sure you want to delete the page "<strong>{appData?.pageTitle || 'this page'}</strong>"? This action cannot be undone.
              </>
            }
            onConfirm={handleDeletePageConfirmed}
            confirmText="Delete Page"
            confirmVariant="destructive"
          />
          <AppFooter onCreateNewPage={createNewBlankPageAndRedirect} />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
