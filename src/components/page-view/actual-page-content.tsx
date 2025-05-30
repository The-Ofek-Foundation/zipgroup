
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import { Clock, Info, Save, Loader2, HelpCircle, Trash2, ClipboardCopy } from "lucide-react";
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
import { PageContentSpinner } from "@/components/ui/page-content-spinner";

interface ActualPageContentProps {
  pageId: string | null;
  initialSharedData?: Partial<AppData>;
  onStartTour?: () => void; // For sample page tour
  forceOpenFormDialog?: boolean; // For sample page tour to control form dialog
}

export function ActualPageContent({ pageId, initialSharedData, onStartTour, forceOpenFormDialog }: ActualPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    createNewPageFromAppData,
    currentPageId,
    setCustomPrimaryColor,
    createNewBlankPageAndRedirect,
    deleteCurrentPageAndRedirect,
  } = useAppData(initialSharedData, pageId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [localPageTitle, setLocalPageTitle] = useState("");
  const [isSavingNewPage, setIsSavingNewPage] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isImportPreview = !!initialSharedData && pathname === '/import';
  const isSamplePage = pathname === '/sample';
  const isReadOnlyPreview = isImportPreview;

  useEffect(() => {
    if (appData?.pageTitle) {
      document.title = appData.pageTitle;
      setLocalPageTitle(appData.pageTitle);
    }
  }, [appData?.pageTitle]);

  // For Joyride to control the form dialog on the sample page
  useEffect(() => {
    if (isSamplePage && forceOpenFormDialog) {
      setIsFormOpen(true);
    }
  }, [isSamplePage, forceOpenFormDialog]);


  const handlePageTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPageTitle(event.target.value);
  };

  const handlePageTitleBlur = () => {
    if (appData && localPageTitle !== appData.pageTitle && !isReadOnlyPreview) {
      setPageTitle(localPageTitle);
    }
  };

  const handlePageTitleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (appData && localPageTitle !== appData.pageTitle && !isReadOnlyPreview) {
        setPageTitle(localPageTitle);
      }
      (event.target as HTMLInputElement).blur();
    }
  };

  const handleShareCurrentPage = async () => {
    if (!currentPageId || !appData || isReadOnlyPreview) {
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
      const shareUrl = `${window.location.origin}/import?sharedData=${encodedJson}`;

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

  const handleCopyPageUrl = async () => {
    if (!currentPageId) {
      toast({ title: "Cannot Copy URL", description: "Page has no unique URL yet. Save it first.", variant: "default" });
      return;
    }
    const urlToCopy = `${window.location.origin}/p/${currentPageId}`;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      toast({ title: "Page URL Copied!", description: "The URL has been copied to your clipboard." });
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy the URL.", variant: "destructive" });
      console.error("Failed to copy page URL: ", err);
    }
  };

  const handleOpenGroupInNewWindow = async (groupToOpen: LinkGroup) => {
     if (!currentPageId) {
      toast({ title: "Error", description: "Save this page first to enable opening groups in a new window.", variant: "destructive" });
      return;
    }
    if (groupToOpen.urls.length === 0) {
      toast({ title: "No URLs", description: "This group has no URLs to open.", variant: "default" });
      return;
    }
    const url = `${window.location.origin}/p/${currentPageId}?openGroupInNewWindow=${groupToOpen.id}`;

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
    if (typeof window !== 'undefined' && pathname.startsWith('/p/') && currentPageId) {
      const currentUrlSearchParams = new URLSearchParams(window.location.search);
      const groupIdToOpen = currentUrlSearchParams.get('openGroupInNewWindow');
      
      if (groupIdToOpen && appData && !isLoading) {
        const group = appData.linkGroups.find(g => g.id === groupIdToOpen);
        const urlToClearParamsFrom = `/p/${currentPageId}`; 
        
        if (currentUrlSearchParams.has('openGroupInNewWindow')) {
            router.replace(urlToClearParamsFrom, { scroll: false }); 
        }

        if (group && group.urls.length > 0) {
          toast({
            title: `Opening "${group.name}"...`,
            description: `Attempting to open ${group.urls.length} link(s). Your browser's popup blocker might prevent some links. This tab will become the first link.`,
            duration: 10000,
          });

          const [firstUrlFull, ...otherUrlsFull] = group.urls.map(normalizeUrl);
          otherUrlsFull.forEach(url => {
            try {
              new URL(url); 
              console.log(`[OpenInNewWindowEffect] Attempting to open (new tab): ${url}`);
              const newTab = window.open(url, '_blank');
              if (!newTab) console.warn(`[OpenInNewWindowEffect] Popup blocker might have prevented opening: ${url}`);
            } catch (e) {
              console.warn(`[OpenInNewWindowEffect] Invalid URL skipped: ${url}`, e);
              toast({ title: "Invalid URL", description: `Skipped invalid URL: ${url}`, variant: "destructive" });
            }
          });
          setTimeout(() => {
            try {
              console.log(`[OpenInNewWindowEffect] Attempting to replace current tab with: ${firstUrlFull}`);
              new URL(firstUrlFull); 
              window.location.replace(firstUrlFull);
            } catch (e) {
              console.error(`[OpenInNewWindowEffect] Error replacing current tab with first URL: ${firstUrlFull}`, e);
              toast({ title: "Error with First Link", description: `The first link "${firstUrlFull}" is invalid or could not be opened. This tab will remain.`, variant: "destructive", duration: 7000 });
            }
          }, 250); 
        } else if (group && group.urls.length === 0) {
          console.log(`[OpenInNewWindowEffect] Group "${group.name}" has no URLs.`);
          toast({ title: "No URLs in Group", description: `The group "${group.name}" has no URLs to open.`, variant: "destructive" });
        } else if (!group) {
          console.log(`[OpenInNewWindowEffect] Group not found for ID: ${groupIdToOpen}`);
          toast({ title: "Group Not Found", description: `Could not find the group with ID "${groupIdToOpen}".`, variant: "destructive" });
        }
      }
    }
  }, [appData, isLoading, currentPageId, router, toast, pathname]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndLinkGroups = (event: DragEndEvent) => {
    if (isReadOnlyPreview) return;
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

  if (isLoading || !appData) {
    return <PageContentSpinner />;
  }

  const handleAddGroup = () => {
    if (isReadOnlyPreview) return;
    setEditingGroup(null);
    setIsFormOpen(true);
  };

  const handleEditGroup = (group: LinkGroup) => {
    if (isReadOnlyPreview) return;
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const handleDeleteGroup = (groupToDelete: LinkGroup) => {
    if (isReadOnlyPreview || !appData) return;
    const updatedGroups = appData.linkGroups.filter(g => g.id !== groupToDelete.id);
    setLinkGroups(updatedGroups);
    toast({ title: "Group Deleted", description: `"${groupToDelete.name}" has been removed.` });
  };

  const handleOpenGroup = (group: LinkGroup) => { /* For toast in LinkGroupCard */ };

  const handleFormSubmit = (groupData: LinkGroup) => {
    if (isReadOnlyPreview || !appData) return;
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

  const handleSavePristineOrSharedPage = async () => {
    if (!appData) return;
    setIsSavingNewPage(true);
    const newPageIdResult = createNewPageFromAppData(); 
    if (newPageIdResult) {
      toast({
        title: isImportPreview ? "Shared Page Saved!" : "Sample Page Saved!",
        description: isImportPreview
          ? "The shared page is now part of your home page and has a unique link."
          : "The sample page is now part of your home page and has a unique link.",
      });
      // For /import, router.push in createNewPageFromAppData handles redirecting to /p/[newPageId]
      // For /sample, it also redirects to /p/[newPageId]
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
    if (deleteCurrentPageAndRedirect && !isReadOnlyPreview) {
      deleteCurrentPageAndRedirect();
    }
    setIsDeleteDialogOpen(false);
  };

  const showInfoBox = isImportPreview || isSamplePage;

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
            themeMode={appData.theme}
            onSetThemeMode={setTheme}
            isReadOnlyPreview={isReadOnlyPreview}
            onInitiateShare={handleShareCurrentPage}
            canShareCurrentPage={!!currentPageId && !isReadOnlyPreview}
            showHomePageLink={true}
            showSamplePageLink={pathname !== '/sample'}
            showShareButton={!isReadOnlyPreview && !!currentPageId}
            onInitiateDelete={isReadOnlyPreview ? undefined : () => setIsDeleteDialogOpen(true)}
            canDeleteCurrentPage={!!currentPageId && !isReadOnlyPreview}
            joyrideProps={{
                "data-joyride-custom-color-picker": "custom-color-picker",
                "data-joyride-theme-switcher": "theme-switcher",
             }}
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
              {currentPageId && appData.lastModified && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center">
                  <Clock className="mr-1.5 h-3 w-3" />
                  Last modified: {format(new Date(appData.lastModified), "MMM d, yyyy, h:mm a")}
                  <Button variant="ghost" size="icon" onClick={handleCopyPageUrl} className="ml-1.5 h-5 w-5 p-0.5 text-muted-foreground hover:text-primary">
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {showInfoBox && (
              <div className="text-center py-6 px-4 border-b border-border mb-8 rounded-lg bg-card shadow" data-joyride={isSamplePage ? "interactive-sample-info" : undefined}>
                <Info className="mx-auto h-10 w-10 text-primary mb-4" />
                 <h2 className="text-xl font-semibold text-foreground mb-2">
                  {isImportPreview ? "Previewing Shared Page" : "Welcome to ZipGroup!"}
                </h2>
                <p className="text-md text-muted-foreground mb-6 max-w-xl mx-auto">
                  {isImportPreview 
                    ? "This is a preview of a shared ZipGroup page. You can explore the links below. When you're ready, save it to your home page to make it your own."
                    : "You're viewing a fully interactive starting page. Customize the title, theme, and link groups below. When you're ready, save it to your home page to make it your own!"
                  }
                </p>
                <Button
                  onClick={handleSavePristineOrSharedPage}
                  size="lg"
                  disabled={isSavingNewPage}
                  data-joyride={isSamplePage ? "save-sample-page-button" : "save-shared-page-button"}
                >
                  {isSavingNewPage ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  {isImportPreview ? "Save This Shared Page to My Home Page" : "Save This Page to My Home Page"}
                </Button>
                {isSamplePage && onStartTour && (
                    <Button variant="outline" size="lg" onClick={onStartTour} className="ml-2">
                        <HelpCircle className="mr-2 h-5 w-5" /> Quick Tour
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
          {!isReadOnlyPreview && (
            <LinkGroupFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={editingGroup}
            />
          )}
          {!isReadOnlyPreview && (
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
          )}
          <AppFooter onCreateNewPage={createNewBlankPageAndRedirect} />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

