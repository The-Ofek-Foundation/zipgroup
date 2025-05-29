
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { LinkGroupList } from "@/components/link-group/link-group-list";
import { LinkGroupFormDialog } from "@/components/link-group/link-group-form-dialog";
import type { LinkGroup, AppData } from "@/lib/types";
import { useAppData } from "@/hooks/use-app-data";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Button } from "@/components/ui/button"; 
import { ClipboardCopy } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Home() {
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null);

  useEffect(() => {
    if (appData?.pageTitle) {
      document.title = appData.pageTitle;
    }
  }, [appData?.pageTitle]);

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
      const pageUrl = window.location.href;
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

  if (isLoading || !appData) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between p-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-1/2 md:w-1/3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 md:p-8">
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
    console.log("Opening group:", group.name);
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
            pageTitle={appData.pageTitle}
            onPageTitleChange={setPageTitle}
            onCreateNewPage={createNewPage}
            customPrimaryColor={appData.customPrimaryColor}
            onSetCustomPrimaryColor={setCustomPrimaryColor}
          />
          <main className="flex-grow container mx-auto p-4 md:p-8">
            <LinkGroupList
              groups={appData.linkGroups}
              onAddGroup={handleAddGroup}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
              onOpenGroup={handleOpenGroup}
            />
          </main>
          <LinkGroupFormDialog
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleFormSubmit}
            initialData={editingGroup}
          />
          <footer className="py-6 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <span>Powered by LinkWarp. Your current page hash:</span>
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
