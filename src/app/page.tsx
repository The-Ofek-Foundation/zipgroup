
"use client";

import React, { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppFooter } from "@/components/layout/app-footer";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useAppData } from "@/hooks/use-app-data"; // For createNewBlankPageAndRedirect in footer

// Skeleton for the entire page when DashboardView might be loading
function PageSkeletonForSuspense() {
  const { createNewBlankPageAndRedirect } = useAppData(undefined, null); // For footer consistency
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
      <AppFooter onCreateNewPage={createNewBlankPageAndRedirect} />
    </div>
  );
}

// The root page now directly renders the Dashboard.
// Shared page logic is moved to /import
// Individual page logic is in /p/[pageId]
export default function Home() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <DashboardView />
    </Suspense>
  );
}
