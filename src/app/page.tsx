
"use client";

import type React from "react";
import { useState, useEffect, Suspense, useCallback } from "react";
import Joyride, { type Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { AppHeader } from "@/components/layout/app-header";
import { LinkGroupList } from "@/components/link-group/link-group-list";
import { LinkGroupFormDialog } from "@/components/link-group/link-group-form-dialog";
import type { LinkGroup, AppData } from "@/lib/types";
import { useAppData } from "@/hooks/use-app-data";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardCopy, Save, Loader2, Info, Share2, Clock, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateRandomHash } from "@/lib/utils";
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

const LOCAL_STORAGE_KEY_PREFIX = "linkwarp_";
const JOYRIDE_PRISTINE_TAKEN_KEY = "linkwarp_joyride_pristine_taken";


function PageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsHook = useSearchParams(); // Renamed to avoid conflict
  const { toast } = useToast();

  const [initialSharedData, setInitialSharedData] = useState<Partial<AppData> | undefined>(undefined);
  const [sharedDataProcessed, setSharedDataProcessed] = useState(false);

  // Joyride State
  const [runJoyride, setRunJoyride] = useState(false);
  const [joyrideKey, setJoyrideKey] = useState(Date.now());

  useEffect(() => {
    if (typeof window !== 'undefined' && !sharedDataProcessed) {
      const sharedDataParam = searchParamsHook.get('sharedData');
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
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('sharedData');
          window.history.replaceState(null, '', newUrl.pathname + newUrl.search + newUrl.hash);
        } catch (error) {
          console.error("Failed to parse sharedData:", error);
          toast({
            title: "Error Loading Shared Page",
            description: "The shared link seems to be invalid or corrupted.",
            variant: "destructive",
          });
          const currentCleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState(null, '', currentCleanUrl);
        }
      }
      setSharedDataProcessed(true);
    }
  }, [searchParamsHook, router, pathname, toast, sharedDataProcessed]);

  const {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    createNewPageFromAppData,
    createNewBlankPage,
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

  // Auto-start Joyride for pristine page if not taken
  useEffect(() => {
    if (!isLoading && !currentHash && !initialSharedData && typeof window !== 'undefined') {
      const tourTaken = localStorage.getItem(JOYRIDE_PRISTINE_TAKEN_KEY);
      if (!tourTaken) {
        setTimeout(() => {
          setRunJoyride(true);
          setJoyrideKey(Date.now()); 
        }, 500);
      }
    }
  }, [isLoading, currentHash, initialSharedData]);


  const pristinePageJoyrideSteps: Step[] = [
    {
      target: '[data-joyride="page-title-input"]',
      content: 'Customize your page title here. This is the main heading for your ZipGroup page.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="theme-switcher"]',
      content: 'Toggle between light and dark themes for your page.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="custom-color-picker"]',
      content: 'Pick a custom primary color to personalize your page further.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="interactive-sample-info"]',
      content: 'This page is fully interactive! Customize it, then let\'s try adding a link group.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="add-new-group-button"]',
      content: 'Click here to add a new link group. Your changes on this page are temporary until you save the entire page.',
      placement: 'top',
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: '[data-joyride="group-form-name-input"]',
      content: 'Enter a name for your group (e.g., "Work Links", "Social Media").',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="group-form-icon-picker"]',
      content: 'Choose an icon that represents your group.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="group-form-urls-input"]',
      content: 'Add your links here. You can add multiple URLs and drag them to reorder.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="group-form-save-button"]',
      content: 'Click to save your new link group!',
      placement: 'top',
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: '[data-joyride="link-group-card"]', // Assumes at least one card (sample or newly added)
      content: 'Your link groups appear as cards. If you have multiple, you can drag them to reorder.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="link-group-edit-button"]', // Assumes at least one card
      content: 'Use the edit button to modify a group\'s details or links.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="link-group-delete-button"]', // Assumes at least one card
      content: 'And the delete button to remove a group.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="save-pristine-page-button"]',
      content: 'Great! Now you know the basics. Save your page to keep all your changes and get a unique shareable link!',
      placement: 'top',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index, step } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunJoyride(false);
      if (status === STATUS.FINISHED && !currentHash && !initialSharedData) {
        localStorage.setItem(JOYRIDE_PRISTINE_TAKEN_KEY, 'true');
      }
    }

    if (type === EVENTS.TOOLTIP_CLOSE && action === ACTIONS.CLOSE) {
      setRunJoyride(false);
    }

    // If a step requires opening a dialog (e.g., "Add New Group"),
    // and the user clicks it via spotlightClicks, ensure the dialog is opened.
    if (type === EVENTS.SPOTLIGHT_CLICKED || type === EVENTS.STEP_AFTER) {
      if (step.target === '[data-joyride="add-new-group-button"]' && index === 4) { // Step for "Add New Group"
         // Check if form is already open to prevent re-opening
        if (!isFormOpen) {
           setIsFormOpen(true);
        }
      }
      // If current step was to save group form, and it's done, close the form.
      // This is tricky because joyride doesn't know when form submission completes.
      // We rely on the user clicking and the form closing itself.
      // A more robust solution might involve custom control of joyride advancement.
    }


    // console.log('Joyride callback data:', data);
  }, [currentHash, initialSharedData, isFormOpen]);

  const startPristineTour = () => {
    setRunJoyride(true);
    setJoyrideKey(Date.now());
  };


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
    if (!appData) return;

    const newHash = generateRandomHash();
    const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const newPageData: AppData = {
      linkGroups: [],
      pageTitle: `ZipGroup Page ${newHash}`,
      theme: appData.theme || currentSystemTheme,
      customPrimaryColor: appData.customPrimaryColor,
      lastModified: Date.now(),
    };

    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${newHash}`, JSON.stringify(newPageData));
    } catch (error) {
      console.error("Failed to save data for new tab:", error);
      toast({ title: "Error", description: "Could not prepare new page for tab.", variant: "destructive" });
      return;
    }

    const newUrl = `${window.location.origin}${pathname}#${newHash}`;
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
    const queryParams = new URLSearchParams(window.location.search);
    const groupIdToOpen = queryParams.get('openGroupInNewWindow');

    if (groupIdToOpen && appData && !isLoading && currentHash) {
      console.log("[OpenInNewWindowEffect] Processing group ID:", groupIdToOpen, "with hash:", currentHash);
      const group = appData.linkGroups.find(g => g.id === groupIdToOpen);

      let urlToClearParamsFrom = currentHash ? `${pathname}#${currentHash}` : pathname;

      if (group && group.urls.length > 0) {
        toast({
          title: `Opening "${group.name}"...`,
          description: `Attempting to open ${group.urls.length} link(s). IMPORTANT: Your browser's popup blocker might prevent some or all links from opening. This tab will become the first link.`,
          duration: 10000,
        });
        console.log("[OpenInNewWindowEffect] Found group:", group.name, "with URLs:", group.urls);

        // Clear the query param by replacing the URL
        const newCleanUrl = new URL(window.location.href);
        newCleanUrl.searchParams.delete('openGroupInNewWindow');
        router.replace(newCleanUrl.pathname + newCleanUrl.search + newCleanUrl.hash, { scroll: false });
        console.log("[OpenInNewWindowEffect] Cleared query param, new URL path should be:", newCleanUrl.pathname + newCleanUrl.search + newCleanUrl.hash);

        const [firstUrl, ...otherUrls] = group.urls;

        otherUrls.forEach(url => {
          try {
            new URL(url);
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
            new URL(firstUrl);
            console.log("[OpenInNewWindowEffect] Attempting to replace current tab with first URL:", firstUrl);
            window.location.replace(firstUrl);
          } catch (e) {
            console.error(`[OpenInNewWindowEffect] Error navigating to first URL "${firstUrl}":`, e);
            toast({ title: "Error with First Link", description: `The first link "${firstUrl}" is invalid or could not be opened. This tab will remain on a clean URL.`, variant: "destructive", duration: 7000 });
          }
        }, 250);
      } else if (group && group.urls.length === 0) {
        console.warn("[OpenInNewWindowEffect] Group found but has no URLs:", group.name);
        toast({ title: "No URLs in Group", description: `The group "${group.name}" has no URLs to open.`, variant: "destructive" });
        const newCleanUrl = new URL(window.location.href);
        newCleanUrl.searchParams.delete('openGroupInNewWindow');
        router.replace(newCleanUrl.pathname + newCleanUrl.search + newCleanUrl.hash, { scroll: false });
      } else if (group === undefined) {
        console.warn("[OpenInNewWindowEffect] Group not found for ID:", groupIdToOpen);
        toast({ title: "Group Not Found", description: `Could not find the group with ID "${groupIdToOpen}".`, variant: "destructive" });
        const newCleanUrl = new URL(window.location.href);
        newCleanUrl.searchParams.delete('openGroupInNewWindow');
        router.replace(newCleanUrl.pathname + newCleanUrl.search + newCleanUrl.hash, { scroll: false });
      }
    } else {
      if (groupIdToOpen) {
        // console.log("[OpenInNewWindowEffect] Conditions not met. GroupID:", groupIdToOpen, "isLoading:", isLoading, "appData:", !!appData, "currentHash:", currentHash);
      }
    }
 }, [searchParamsHook, appData, isLoading, currentHash, pathname, router, toast]);


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

  const isPristineSamplePage = !currentHash && appData && !initialSharedData;
  const isSharedPreview = !currentHash && appData && !!initialSharedData;
  const isReadOnlyPreview = isSharedPreview; // Only shared previews are read-only until saved


  if (isLoading || !appData || !sharedDataProcessed) {
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
          <div className="flex justify-end mb-6">
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
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

  const handleSavePristineOrSharedPage = async () => {
    setIsSavingNewPage(true);
    const newHash = createNewPageFromAppData();
    if (newHash) {
      toast({
        title: "Page Saved!",
        description: "Your new ZipGroup page is ready.",
      });
      if (isPristineSamplePage) {
        localStorage.setItem(JOYRIDE_PRISTINE_TAKEN_KEY, 'true');
      }
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
      {typeof window !== 'undefined' && (
        <Joyride
          key={joyrideKey}
          steps={pristinePageJoyrideSteps}
          run={runJoyride}
          callback={handleJoyrideCallback}
          continuous
          showProgress
          showSkipButton
          scrollToFirstStep
          disableScrollParentFix 
          spotlightClicks={true} // Enable for steps that require clicking the target
          styles={{
            options: {
              zIndex: 10000, 
              arrowColor: 'hsl(var(--background))',
              backgroundColor: 'hsl(var(--background))',
              primaryColor: 'hsl(var(--primary))',
              textColor: 'hsl(var(--foreground))',
            },
            tooltip: {
              borderRadius: 'var(--radius)',
            },
            buttonClose: {
              // display: 'none', // Hiding close button to encourage using skip/next
            },
          }}
        />
      )}
      <TooltipProvider delayDuration={100}>
        <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
          <AppHeader
            onCreateNewPage={isPristineSamplePage || isSharedPreview ? handleSavePristineOrSharedPage : createNewBlankPage}
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

            {(isPristineSamplePage || isSharedPreview) && (
              <div
                className="text-center py-6 px-4 border-b border-border mb-8 rounded-lg bg-card shadow"
                data-joyride={isPristineSamplePage ? "interactive-sample-info" : undefined}
              >
                <Info className="mx-auto h-10 w-10 text-primary mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {isSharedPreview ? "Previewing Shared Page" : "Welcome to ZipGroup!"}
                </h2>
                <p className="text-md text-muted-foreground mb-6 max-w-xl mx-auto">
                  {isSharedPreview
                    ? "This is a preview of a shared ZipGroup page. You can explore the links below. When you're ready, save it to your dashboard to make it your own and enable editing."
                    : "You're viewing a fully interactive starting page. Customize the title, theme, and link groups below. When you're ready, save it to your dashboard to make it your own!"}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={handleSavePristineOrSharedPage}
                    size="lg"
                    disabled={isSavingNewPage}
                    data-joyride="save-pristine-page-button"
                  >
                    {isSavingNewPage ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-5 w-5" />
                    )}
                    {isSharedPreview ? "Save This Shared Page to My Dashboard" : "Save This Page to My Dashboard"}
                  </Button>
                  {isPristineSamplePage && (
                    <Button variant="outline" size="lg" onClick={startPristineTour}>
                      <HelpCircle className="mr-2 h-5 w-5" /> Quick Tour
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {isSharedPreview
                    ? "Saving will create a new copy in your dashboard, allowing you to edit and manage it."
                    : "After saving, you'll get a unique URL for this page."}
                </p>
              </div>
            )}

            {!isReadOnlyPreview && appData && (
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
            )}
            {isReadOnlyPreview && appData && (
              <LinkGroupList
                groups={appData.linkGroups}
                onAddGroup={handleAddGroup}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onOpenGroup={handleOpenGroup}
                onOpenInNewWindow={handleOpenGroupInNewWindow}
                isReadOnlyPreview={true}
              />
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


function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-md" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex justify-between items-center pt-4 border-t">
        <Skeleton className="h-9 w-full mr-2" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Wrap PageContent with Suspense because useSearchParams() is used
export default function Home() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <PageContent />
    </Suspense>
  );
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

    