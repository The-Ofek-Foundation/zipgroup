
"use client";

import React, { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { AppFooter } from "@/components/layout/app-footer";
import { useAppData } from "@/hooks/use-app-data";
import { HomeIcon as PageHomeIcon, PlusCircle, BookOpenCheck, FileText, Layers, SunMoon, Palette, Clock, Share2, Trash2, Info, Save, Loader2, HelpCircle } from "lucide-react"; // Renamed Home to HomeIcon to avoid conflict with page component
import { TooltipProvider } from "@/components/ui/tooltip";

// Dynamically import the new components
const DashboardView = React.lazy(() =>
  import('@/components/dashboard/dashboard-view').then(module => ({ default: module.DashboardView }))
);
const ActualPageContent = React.lazy(() =>
  import('@/components/page-view/actual-page-content').then(module => ({ default: module.ActualPageContent }))
);


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
      <AppFooter onCreateNewPage={() => {
        console.log("Create new page from skeleton footer clicked (dummy)");
      }} />
    </div>
  );
}

function PageRouter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { createNewBlankPageAndRedirect, isLoading: appDataIsLoading, appData } = useAppData();

  const [renderMode, setRenderMode] = useState<'loading' | 'dashboard' | 'page'>('loading');
  const [clientSideCheckDone, setClientSideCheckDone] = useState(false);
  const redirectInitiatedRef = useRef(false);


  useEffect(() => {
    if (typeof window !== 'undefined' && pathname === '/' && !redirectInitiatedRef.current) {
      const hash = window.location.hash.substring(1).split('?')[0];
      const sharedData = searchParams.get('sharedData');

      if (!hash && !sharedData) {
        redirectInitiatedRef.current = true;
        createNewBlankPageAndRedirect();
        // No need to set renderMode here as the page will navigate away.
        return;
      }
    }
    // If not redirecting from root or already redirected, allow further processing.
    // This ensures subsequent effects can determine the correct render mode.
    if (redirectInitiatedRef.current && (window.location.hash || searchParams.get('sharedData'))) {
      // If a redirect was initiated but now we have a hash/sharedData (e.g., after redirect),
      // we should stop considering it an initial root redirect.
    }
  }, [pathname, searchParams, createNewBlankPageAndRedirect]);


  useEffect(() => {
    const determineMode = () => {
      if (typeof window === 'undefined') {
        setRenderMode('loading');
        return;
      }

      const hash = window.location.hash.substring(1).split('?')[0];
      const sharedData = searchParams.get('sharedData');

      if (pathname === '/' && !hash && !sharedData) {
         // If a redirect was supposed to happen but didn't (e.g. something blocked createNewBlankPageAndRedirect's effect),
         // we might end up showing dashboard. But the first effect should handle the redirect.
         // If we are at root and redirect was already handled or not needed, show dashboard.
        setRenderMode('dashboard');
      } else {
        setRenderMode('page');
      }
      setClientSideCheckDone(true);
    };

    determineMode(); // Initial determination

    const handleHashChange = () => determineMode();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [pathname, searchParams]); // Depends on pathname and searchParams to re-evaluate if they change


  if (!clientSideCheckDone || renderMode === 'loading') {
     // If we are on the root, and a redirect *should* be happening according to the first effect,
     // keep showing skeleton until redirect completes or redirectInitiatedRef becomes false.
     // This specific check for root path during loading needs to be careful not to block indefinitely.
    if (pathname === '/' && !window.location.hash && !searchParams.get('sharedData') && redirectInitiatedRef.current && !clientSideCheckDone) {
      return <PageSkeletonForSuspense />;
    }
    if (!clientSideCheckDone) { // General loading before mode is determined
        return <PageSkeletonForSuspense />;
    }
  }


  if (renderMode === 'dashboard') {
    return (
      <TooltipProvider delayDuration={100}>
        <DashboardView />
      </TooltipProvider>
    );
  }
  return <ActualPageContent />;
}


export default function Home() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <PageRouter />
    </Suspense>
  );
}
