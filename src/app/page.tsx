
"use client";

import React, { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { AppFooter } from "@/components/layout/app-footer";
import { useAppData } from "@/hooks/use-app-data";
import { HomeIcon as PageHomeIcon, PlusCircle, BookOpenCheck, FileText, Layers, SunMoon, Palette, Clock, Share2, Trash2, Info, Save, Loader2, HelpCircle, ClipboardCopy } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// Direct static imports instead of React.lazy
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ActualPageContent } from "@/components/page-view/actual-page-content";


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
  const [renderMode, setRenderMode] = useState<'loading' | 'dashboard' | 'page'>('loading');
  const [urlHashForKeystr, setUrlHashForKeystr] = useState<string | null>(null);

  useEffect(() => {
    // This effect updates urlHashForKeystr whenever the hash actually changes in the URL
    const updateHashStateFromLocation = () => {
      if (typeof window !== 'undefined') {
        const currentActualHash = window.location.hash.substring(1).split('?')[0];
        setUrlHashForKeystr(currentActualHash || null);
      }
    };
    updateHashStateFromLocation(); // Initial check
    window.addEventListener('hashchange', updateHashStateFromLocation);
    return () => window.removeEventListener('hashchange', updateHashStateFromLocation);
  }, []); // Empty dependency array: runs once on mount to set up listener


  useEffect(() => {
    // Effect to determine renderMode based on URL state (hash, sharedData)
    const determineMode = () => {
      if (typeof window === 'undefined') {
        setRenderMode('loading'); // Should ideally not happen if window check is above
        return;
      }

      const currentPath = pathname; // from usePathname() - this is reactive
      const hash = window.location.hash.substring(1).split('?')[0]; // direct read
      const sharedDataParam = searchParams.get('sharedData'); // from useSearchParams() - this is reactive

      if (currentPath === '/' && !hash && !sharedDataParam) {
        setRenderMode('dashboard');
      } else {
        setRenderMode('page');
      }
    };

    determineMode(); // Initial determination

    // Listen for hash changes to re-determine mode
    // This is important for navigation like clicking "Home" when on a page with a hash
    const handleHashChangeForMode = () => {
      determineMode();
    };
    window.addEventListener('hashchange', handleHashChangeForMode);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('hashchange', handleHashChangeForMode);
    };
  }, [pathname, searchParams]); // Dependencies: pathname and searchParams ensure this re-runs if query params or path change


  if (renderMode === 'loading') {
    return <PageSkeletonForSuspense />;
  }

  if (renderMode === 'dashboard') {
    return (
      <TooltipProvider delayDuration={100}>
        <DashboardView />
      </TooltipProvider>
    );
  }
  
  // renderMode must be 'page'
  // Generate a key that changes when transitioning from shared/pristine to a hashed page
  // or from one hash to another.
  const sharedDataParamValue = searchParams.get('sharedData');
  const pageKey = urlHashForKeystr || (sharedDataParamValue ? `shared-${sharedDataParamValue.substring(0,10)}` : 'new-unsaved-page');
  
  return <ActualPageContent key={pageKey} routeHash={urlHashForKeystr} />;
}


export default function Home() {
  return (
    <Suspense fallback={<PageSkeletonForSuspense />}>
      <PageRouter />
    </Suspense>
  );
}
