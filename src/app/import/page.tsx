
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ActualPageContent } from '@/components/page-view/actual-page-content';
import { PageContentSpinner } from '@/components/ui/page-content-spinner';
import type { AppData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AppFooter } from '@/components/layout/app-footer';
import { useAppData } from '@/hooks/use-app-data'; // For footer


function ImportPageSkeleton() {
 const { createNewBlankPageAndRedirect } = useAppData(undefined, null);
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
         <PageContentSpinner text="Loading shared page..." />
      </main>
      <AppFooter onCreateNewPage={createNewBlankPageAndRedirect} />
    </div>
  );
}


function ImportPageContentInternal() {
  const searchParams = useSearchParams();
  const [initialSharedData, setInitialSharedData] = useState<Partial<AppData> | undefined>(undefined);
  const [errorParsing, setErrorParsing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { createNewBlankPageAndRedirect } = useAppData(undefined, null); // For footer

  useEffect(() => {
    const sharedDataParam = searchParams.get('sharedData');
    if (sharedDataParam) {
      try {
        const decodedJson = decodeURIComponent(sharedDataParam);
        const parsedData = JSON.parse(decodedJson) as AppData;
        setInitialSharedData(parsedData);
      } catch (error) {
        console.error("Failed to parse sharedData for import:", error);
        setErrorParsing("Could not load the shared page. The link might be corrupted or invalid.");
      }
    } else {
      setErrorParsing("No shared data found in the link. Please check the URL.");
    }
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return <ImportPageSkeleton />;
  }

  if (errorParsing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-semibold text-destructive mb-4">Import Error</h1>
        <p className="text-muted-foreground mb-6 max-w-md">{errorParsing}</p>
        <AppFooter onCreateNewPage={createNewBlankPageAndRedirect} />
      </div>
    );
  }

  if (initialSharedData) {
    // Use a key derived from the sharedData to ensure re-mount if different shared data is loaded via client-side nav
    const sharedDataKey = `import-${searchParams.get('sharedData')?.substring(0, 50) || Date.now()}`;
    return <ActualPageContent key={sharedDataKey} pageId={null} initialSharedData={initialSharedData} />;
  }

  // Fallback if somehow sharedDataParam was present but initialSharedData wasn't set (should be caught by errorParsing)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-2xl font-semibold">Page Not Found</h1>
      <p className="text-muted-foreground mb-6">The shared page could not be loaded.</p>
      <AppFooter onCreateNewPage={createNewBlankPageAndRedirect} />
    </div>
  );
}

export default function ImportPage() {
  return (
    // Suspense at this level handles the useSearchParams hook
    <Suspense fallback={<ImportPageSkeleton />}>
      <ImportPageContentInternal />
    </Suspense>
  );
}
