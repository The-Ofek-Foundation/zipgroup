
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { AppFooter } from "@/components/layout/app-footer"; // For skeleton
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ActualPageContent } from "@/components/page-view/actual-page-content";
import type { AppData } from "@/lib/types";

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
      {/* Using a dummy onCreateNewPage for the skeleton's footer */}
      <AppFooter onCreateNewPage={() => console.log("Dummy create new page from skeleton footer")} />
    </div>
  );
}

// This component decides whether to render the Dashboard or ActualPageContent (for shared data)
// Individual pages are now handled by /p/[pageId]/page.tsx
function RootPageContent() {
  const searchParams = useSearchParams();
  const [initialSharedData, setInitialSharedData] = useState<Partial<AppData> | undefined>(undefined);
  const [isLoadingSharedData, setIsLoadingSharedData] = useState(true);

  useEffect(() => {
    // This effect runs only once on the client to check for sharedData
    const sharedDataParam = searchParams.get('sharedData');
    if (sharedDataParam) {
      try {
        const decodedJson = decodeURIComponent(sharedDataParam);
        const parsedData = JSON.parse(decodedJson) as AppData;
        setInitialSharedData(parsedData);
        // Do NOT clear sharedData from URL here, ActualPageContent handles it
      } catch (error) {
        console.error("Failed to parse sharedData on root page:", error);
        // Potentially show an error toast or redirect
      }
    }
    setIsLoadingSharedData(false);
  }, [searchParams]); // Runs when searchParams object changes

  if (isLoadingSharedData) {
    return <PageSkeletonForSuspense />;
  }

  if (initialSharedData) {
    // Render ActualPageContent in preview mode for the shared data
    // The key ensures re-mount if sharedData content somehow changes, though unlikely for this param.
    return <ActualPageContent key={`shared-${JSON.stringify(initialSharedData).substring(0,20)}`} pageId={null} initialSharedData={initialSharedData} />;
  }

  // Default to DashboardView if no sharedData
  return <DashboardView />;
}


export default function Home() {
  return (
    // Suspense around RootPageContent is good practice if it or its children might suspend
    // e.g. due to data fetching or other async operations not handled by Next.js server components.
    // Since RootPageContent now uses useSearchParams, it must be wrapped in Suspense.
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <RootPageContent />
    </Suspense>
  );
}
