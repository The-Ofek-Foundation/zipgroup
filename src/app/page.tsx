
"use client";

import type React from "react";
import { useState, useEffect, Suspense, useRef } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { LinkGroupList } from "@/components/link-group/link-group-list";
import { LinkGroupFormDialog } from "@/components/link-group/link-group-form-dialog";
import type { LinkGroup, AppData } from "@/lib/types";
import { useAppData } from "@/hooks/use-app-data";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { ClipboardCopy } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateRandomHash } from "@/lib/utils";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const LOCAL_STORAGE_KEY_PREFIX = "linkwarp_"; 

function PageContent() {
  const {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    createNewPage,
    currentHash, 
    setCustomPrimaryColor,
  } = useAppData();
  
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams(); // For reading standard query parameters

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);
  const [localPageTitle, setLocalPageTitle] = useState("");

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
        description: "Page URL not available yet.",
        variant: "destructive",
      });
      return;
    }
    try {
      // Ensure only the path and hash are copied, no query params
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

  const handleOpenNewPageInNewTab = () => {
    if (!appData) return;

    const newHash = generateRandomHash();
    const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const newPageData: AppData = {
      linkGroups: [],
      pageTitle: `ZipGroup Page ${newHash}`,
      theme: appData.theme || currentSystemTheme,
      customPrimaryColor: appData.customPrimaryColor,
    };

    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${newHash}`, JSON.stringify(newPageData));
    } catch (error) {
      console.error("Failed to save data for new tab:", error);
      toast({
        title: "Error Preparing New Page",
        description: "Could not save settings for the new tab.",
        variant: "destructive",
      });
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

    const specialUrl = `${window.location.origin}${pathname}?openGroupInNewWindow=${groupToOpen.id}#${currentHash}`;

    try {
      await navigator.clipboard.writeText(specialUrl);
      toast({
        title: "Link Copied for New Window!",
        description: (
          <div>
            <p className="mb-2">A special link to open this group in a new window has been copied to your clipboard.</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Manually open a new browser window.</li>
              <li>Paste the copied link into the address bar.</li>
              <li>Press Enter.</li>
            </ol>
            <p className="mt-2">The new window will then open all links from the group "{groupToOpen.name}".</p>
          </div>
        ),
        duration: 15000, // Longer duration for instructions
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
    // This effect runs in the new window when the user pastes the special URL
    const groupIdToOpen = searchParams.get('openGroupInNewWindow');
    
    console.log('[OpenInNewWindowEffect] Triggered. GroupID (from query param):', groupIdToOpen, 'isLoading:', isLoading, 'appData:', !!appData, 'currentHash (from useAppData):', currentHash);

    if (groupIdToOpen && appData && !isLoading && currentHash) {
      console.log('[OpenInNewWindowEffect] Conditions met. Processing group ID:', groupIdToOpen);
      console.log('[OpenInNewWindowEffect] Link groups available:', appData.linkGroups);

      const group = appData.linkGroups.find(g => g.id === groupIdToOpen);
      console.log('[OpenInNewWindowEffect] Found group:', group);

      // URL to clear query params from, retaining the hash
      const urlToClearParamsFrom = currentHash ? `${pathname}#${currentHash}` : pathname;

      if (group && group.urls.length > 0) {
        console.log('[OpenInNewWindowEffect] Group has URLs. URLs:', group.urls);
        toast({
          title: `Opening "${group.name}"...`,
          description: `Attempting to open ${group.urls.length} link(s). IMPORTANT: Your browser's popup blocker might prevent some or all links from opening. Please check it if links do not appear. This tab will become the first link.`,
          duration: 10000, 
        });

        const [firstUrl, ...otherUrls] = group.urls;
        console.log('[OpenInNewWindowEffect] First URL:', firstUrl, 'Other URLs:', otherUrls);

        otherUrls.forEach(url => {
          try {
            new URL(url); 
            console.log(`[OpenInNewWindowEffect] Attempting to open (other): ${url}`);
            const newTab = window.open(url, '_blank');
            if (newTab) {
              console.log(`[OpenInNewWindowEffect] Successfully initiated opening for: ${url}`);
            } else {
              console.warn(`[OpenInNewWindowEffect] window.open returned falsy for: ${url}. Popup blocker might still be active or other issue.`);
              toast({ title: "Popup Might Be Active", description: `Could not open: ${url}. Check popup blocker.`, variant: "destructive", duration: 6000 });
            }
          } catch (e) {
            console.warn(`[OpenInNewWindowEffect] Invalid URL skipped in new window: ${url}`, e);
            toast({ title: "Invalid URL", description: `Skipped invalid URL: ${url}`, variant: "destructive"});
          }
        });
        
        // Clear query param first
        console.log(`[OpenInNewWindowEffect] Clearing query param, new URL: ${urlToClearParamsFrom}`);
        router.replace(urlToClearParamsFrom, { scroll: false }); 

        try {
          new URL(firstUrl); 
          console.log(`[OpenInNewWindowEffect] Attempting to navigate current tab to first URL after delay: ${firstUrl}`);
          setTimeout(() => {
             console.log(`[OpenInNewWindowEffect] Timeout: Navigating to ${firstUrl}`);
             window.location.replace(firstUrl); // Navigate the current tab
          }, 250); 
        } catch (e) {
           console.error(`[OpenInNewWindowEffect] Invalid first URL, cannot replace helper tab: ${firstUrl}`, e);
           toast({ title: "Error with First Link", description: `The first link "${firstUrl}" is invalid. This tab will remain on a clean URL.`, variant: "destructive", duration: 7000});
           // URL already cleared (router.replace was called before this try-catch)
        }
      } else if (group && group.urls.length === 0) {
        console.log('[OpenInNewWindowEffect] Group found but has no URLs.');
        toast({ title: "No URLs in Group", description: `The group "${group.name}" has no URLs to open.`, variant: "destructive" });
        console.log(`[OpenInNewWindowEffect] Clearing query param (group has no URLs), new URL: ${urlToClearParamsFrom}`);
        router.replace(urlToClearParamsFrom, { scroll: false }); 
      } else if (group === undefined) { 
        console.log('[OpenInNewWindowEffect] Group not found for ID:', groupIdToOpen);
        toast({ title: "Group Not Found", description: `Could not find the group with ID "${groupIdToOpen}".`, variant: "destructive" });
        console.log(`[OpenInNewWindowEffect] Clearing query param (group not found), new URL: ${urlToClearParamsFrom}`);
        router.replace(urlToClearParamsFrom, { scroll: false }); 
      }
    } else {
        if (groupIdToOpen && (isLoading || !appData || !currentHash) ) { 
            // Only log if groupIdToOpen exists but other conditions are not met yet, to avoid noise
            console.log('[OpenInNewWindowEffect] Conditions not met yet. GroupID parsed:', groupIdToOpen, 'appData loaded:', !!appData, 'isLoading:', isLoading, 'currentHash set:', !!currentHash);
        }
    }
  // Ensure dependencies are correct, especially if logic inside relies on more variables from appData or other hooks
  }, [searchParams, appData, isLoading, currentHash, router, pathname, toast, setLinkGroups /* if appData.linkGroups could be stale */]);


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

  const handleOpenGroup = (group: LinkGroup) => {
    // This function is primarily for the toast in LinkGroupCard, actual opening happens there.
  };

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


  return (
    <ThemeProvider 
      appData={appData}
      onThemeChange={setTheme}
    >
      <TooltipProvider delayDuration={100}>
        <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
          <AppHeader
            onCreateNewPage={createNewPage}
            customPrimaryColor={appData.customPrimaryColor}
            onSetCustomPrimaryColor={setCustomPrimaryColor}
          />
          <main className="flex-grow container mx-auto p-4 md:p-8">
            <div className="mb-8 text-center">
              <Input
                type="text"
                value={localPageTitle}
                onChange={handlePageTitleChange}
                onBlur={handlePageTitleBlur}
                onKeyPress={handlePageTitleKeyPress}
                className="w-full max-w-2xl mx-auto text-3xl md:text-4xl font-bold bg-transparent border-0 border-b-2 border-transparent focus:border-primary shadow-none focus-visible:ring-0 text-center py-2 h-auto"
                placeholder="Enter Page Title"
                aria-label="Page Title"
              />
            </div>

            <LinkGroupList
              groups={appData.linkGroups}
              onAddGroup={handleAddGroup}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
              onOpenGroup={handleOpenGroup}
              onOpenInNewWindow={handleOpenGroupInNewWindow}
            />
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
              <span className="hidden sm:inline">. Your current page hash:</span>
              <span className="sm:hidden">. Hash:</span>
              <code className="font-mono bg-muted p-1 rounded text-xs">{currentHash || 'loading...'}</code>
              {currentHash && (
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

// Wrap PageContent with Suspense for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <PageContent />
    </Suspense>
  );
}

// A simplified skeleton for the Suspense fallback, as the full one might depend on hooks not yet available
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
    

    
