
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
import { AppFooter } from "@/components/layout/app-footer";


const JOYRIDE_SAMPLE_TAKEN_KEY = "linkwarp_joyride_sample_taken"; 


function SamplePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [runJoyride, setRunJoyride] = useState(false);
  const [joyrideKey, setJoyrideKey] = useState(Date.now());

  const {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    createNewPageFromAppData, 
    createNewBlankPageAndRedirect, 
    currentHash, 
    setCustomPrimaryColor,
  } = useAppData(); 

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

  useEffect(() => {
    if (!isLoading && appData && pathname === '/sample' && typeof window !== 'undefined') {
      const tourTaken = localStorage.getItem(JOYRIDE_SAMPLE_TAKEN_KEY);
      if (!tourTaken) {
        setTimeout(() => {
          setRunJoyride(true);
          setJoyrideKey(Date.now()); 
        }, 500);
      }
    }
  }, [isLoading, appData, pathname]);

  const samplePageJoyrideSteps: Step[] = [
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
      target: '[data-joyride="link-group-card"]', 
      content: 'Your link groups appear as cards. If you have multiple, you can drag them to reorder.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="link-group-edit-button"]', 
      content: 'Use the edit button to modify a group\'s details or links.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="link-group-delete-button"]', 
      content: 'And the delete button to remove a group.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="save-sample-page-button"]', 
      content: 'Great! Now you know the basics. Save your customized sample page to your home page to keep all your changes and get a unique shareable link!',
      placement: 'top',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index, step } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunJoyride(false);
      if (status === STATUS.FINISHED && pathname === '/sample') {
        localStorage.setItem(JOYRIDE_SAMPLE_TAKEN_KEY, 'true');
      }
    }

    if (type === EVENTS.TOOLTIP_CLOSE && action === ACTIONS.CLOSE) {
      setRunJoyride(false);
    }
    
    if (type === EVENTS.SPOTLIGHT_CLICKED || type === EVENTS.STEP_AFTER) {
      if (step.target === '[data-joyride="add-new-group-button"]' && index === 4) { 
        if (!isFormOpen) {
           setIsFormOpen(true);
        }
      }
    }
  }, [pathname, isFormOpen]);

  const startSampleTour = () => {
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
  
  const handleOpenGroupInNewWindow = async (groupToOpen: LinkGroup) => {
    toast({ title: "Info", description: "Opening in new window is available for saved pages.", variant: "default" });
  };

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

  if (isLoading || !appData) {
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
              <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-4"> <Skeleton className="h-12 w-12 rounded-md" /> <div className="space-y-1 flex-1"> <Skeleton className="h-6 w-3/4" /> <Skeleton className="h-4 w-1/2" /> </div> </div> <div className="space-y-2"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-5/6" /> <Skeleton className="h-4 w-2/3" /> </div> <div className="flex justify-between items-center pt-4 border-t"> <Skeleton className="h-9 w-full mr-2" /> <div className="flex gap-2"> <Skeleton className="h-9 w-9 rounded-md" /> <Skeleton className="h-9 w-9 rounded-md" /> </div> </div>
              </div>
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

  const handleSaveSamplePage = async () => {
    setIsSavingNewPage(true);
    const newHash = createNewPageFromAppData(); 
    if (newHash) {
      toast({
        title: "Sample Page Saved!",
        description: "The sample page is now part of your home page and has a unique link.",
      });
      localStorage.setItem(JOYRIDE_SAMPLE_TAKEN_KEY, 'true'); 
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
          steps={samplePageJoyrideSteps}
          run={runJoyride}
          callback={handleJoyrideCallback}
          continuous
          showProgress
          showSkipButton
          scrollToFirstStep
          disableScrollParentFix 
          spotlightClicks={true} 
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
          }}
        />
      )}
      <TooltipProvider delayDuration={100}>
        <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
          <AppHeader
            onCreateNewPage={createNewBlankPageAndRedirect} 
            customPrimaryColor={appData.customPrimaryColor}
            onSetCustomPrimaryColor={setCustomPrimaryColor}
            isReadOnlyPreview={false} 
            onInitiateShare={() => toast({ title: "Info", description: "Save this sample page first to get a shareable link."})}
            canShareCurrentPage={false} 
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
                data-joyride="page-title-input"
              />
            </div>

            <div
              className="text-center py-6 px-4 border-b border-border mb-8 rounded-lg bg-card shadow"
              data-joyride="interactive-sample-info"
            >
              <Info className="mx-auto h-10 w-10 text-primary mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Welcome to ZipGroup!
              </h2>
              <p className="text-md text-muted-foreground mb-6 max-w-xl mx-auto">
                You're viewing a fully interactive starting page. Customize the title, theme, and link groups below. When you're ready, save it to your home page to make it your own!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={handleSaveSamplePage}
                  size="lg"
                  disabled={isSavingNewPage}
                  data-joyride="save-sample-page-button"
                >
                  {isSavingNewPage ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  Save This Sample Page to My Home Page
                </Button>
                <Button variant="outline" size="lg" onClick={startSampleTour}>
                  <HelpCircle className="mr-2 h-5 w-5" /> Quick Tour
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                After saving, you'll get a unique URL for this page.
              </p>
            </div>

            {appData && (
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

function PageSkeletonForSuspense() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}


export default function SamplePage() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <SamplePageContent />
    </Suspense>
  );
}
