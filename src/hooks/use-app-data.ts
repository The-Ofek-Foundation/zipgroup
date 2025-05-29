
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";
const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';


// For a brand new page created via root redirect or "New Page" button
const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};

// For the /sample page
export const defaultSampleAppData: Omit<AppData, 'lastModified'> = {
  pageTitle: "Explore ZipGroup - Sample Page",
  theme: 'light', 
  customPrimaryColor: undefined,
  linkGroups: [
    {
      id: "sample-group-1",
      name: "Personal & Professional",
      icon: "Briefcase",
      urls: [
        "ofek.phd",
        "theofekfoundation.org",
      ],
    },
    {
      id: "sample-group-2",
      name: "Foundation Projects",
      icon: "Library",
      urls: [
        "blog.theofekfoundation.org",
        "songs.theofekfoundation.org",
      ],
    },
    {
      id: "sample-group-3",
      name: "Family Site",
      icon: "Home",
      urls: [
        "gila.family",
      ],
    },
  ],
};


export function useAppData(initialExternalData?: Partial<AppData>) {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname(); 

  const currentHashRef = useRef<string | null>(null);
  useEffect(() => {
    currentHashRef.current = currentHash;
  }, [currentHash]);

  const loadData = useCallback((hash: string): AppData | null => {
    if (!hash) return null;
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        if (parsedData.pageTitle && (parsedData.pageTitle.startsWith("LinkWarp Page"))) { // Migration from old name
          parsedData.pageTitle = `ZipGroup Page ${hash}`;
        }
        if (!parsedData.theme) {
          parsedData.theme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return parsedData;
      }
    } catch (error) {
      console.error("Failed to load data from local storage:", error);
    }
    return null;
  }, []);

  const saveData = useCallback((hash: string, dataToSave: AppData) => {
    if (!hash) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      // Prevent saving effectively "empty" default pages that were never really interacted with
      // Only check for default title if it's a new blank page, not a customized sample/shared page
      if (
        finalData.linkGroups && finalData.linkGroups.length === 0 &&
        finalData.pageTitle === "New ZipGroup Page" && 
        !finalData.customPrimaryColor && 
        (!initialExternalData && pathname !== '/sample') // Ensure this logic doesn't apply to saving sample/shared
      ) {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
        // Also remove from dashboard order if it exists there
        const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
        if (orderJson) {
            let order = JSON.parse(orderJson) as string[];
            order = order.filter(h => h !== hash);
            localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
        }

      } else {
         localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(finalData));
      }
    } catch (error) {
      console.error("Failed to save or remove data from local storage:", error);
    }
  }, [pathname, initialExternalData]); // Added dependencies

  useEffect(() => {
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialHashFromUrl = typeof window !== 'undefined' ? window.location.hash.substring(1).split('?')[0] : '';

    let dataToLoad: AppData | null = null;
    let hashToUse: string | null = initialHashFromUrl;

    if (pathname === '/sample' && !initialHashFromUrl && !initialExternalData) {
      dataToLoad = {
        ...defaultSampleAppData, 
        theme: defaultSampleAppData.theme || systemTheme,
        customPrimaryColor: defaultSampleAppData.customPrimaryColor,
      };
      hashToUse = null; 
    } else if (initialExternalData && !initialHashFromUrl) {
      dataToLoad = {
        ...defaultAppDataBase, 
        pageTitle: initialExternalData.pageTitle || "New ZipGroup Page",
        linkGroups: initialExternalData.linkGroups || [], 
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
      };
      hashToUse = null; 
    } else if (hashToUse) {
      const loaded = loadData(hashToUse);
      if (loaded) {
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        dataToLoad = {
          ...defaultAppDataBase,
          pageTitle: `New ZipGroup Page`, // Default for a hash that doesn't exist yet
          theme: systemTheme,
          customPrimaryColor: undefined,
        };
      }
    } else if (pathname === '/') {
      // This case means the dashboard is shown. PageRouter in page.tsx handles this.
      // useAppData doesn't need to set page-specific data here.
      setIsLoading(false); 
      setCurrentHash(null);
      setAppData(null); 
      return; 
    } else {
      // Other paths or unhandled scenarios - potentially a loading state before PageRouter decides
      setIsLoading(true); 
      setAppData(null);
      setCurrentHash(null);
      return; 
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0]; // Clean hash

      // If navigating to the root path (shows dashboard) and no sharedData, clear page-specific data
      if (pathname === '/' && !newHashValue && !new URLSearchParams(window.location.search).has('sharedData')) {
        setAppData(null);
        setCurrentHash(null);
        setIsLoading(false); // Not loading page-specific data for dashboard
        return;
      }

      // Avoid re-loading if hash hasn't effectively changed (excluding query params within hash)
      if (newHashValue === currentHashRef.current && pathname !== '/sample') return; 
      
      setIsLoading(true);
      if (newHashValue) {
        const newData = loadData(newHashValue);
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (newData) {
          setAppData({ ...newData, theme: newData.theme || currentSystemTheme });
        } else {
          const freshData: AppData = {
            ...defaultAppDataBase,
            pageTitle: `New ZipGroup Page`, // Default for a newly created hash
            theme: currentSystemTheme,
            customPrimaryColor: undefined,
            lastModified: Date.now()
          };
          saveData(newHashValue, freshData);
          setAppData(freshData);
        }
        setCurrentHash(newHashValue);
      } else if (pathname === '/sample' && !initialExternalData) {
        // Reset to sample data if navigating to /sample without a hash
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const samplePageData: AppData = {
          ...defaultSampleAppData,
          theme: defaultSampleAppData.theme || currentSystemTheme,
          customPrimaryColor: defaultSampleAppData.customPrimaryColor,
        };
        setAppData(samplePageData);
        setCurrentHash(null);
      } else {
        // If hash becomes empty but not on /sample and not dashboard case
        setAppData(null); // Or potentially load pristine page if on /?
        setCurrentHash(null);
      }
      setIsLoading(false);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadData, saveData, initialExternalData, pathname, router]); 

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      const isPristineOrSharedUnsaved = currentHashRef.current === null;
      
      let baseData: AppData;
      if (prevData) {
        baseData = prevData;
      } else if (pathname === '/sample' && !currentHashRef.current) {
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        baseData = { ...defaultSampleAppData, theme: defaultSampleAppData.theme || systemTheme } as AppData;
      } else if (isPristineOrSharedUnsaved && initialExternalData) {
         const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
         baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: systemTheme, ...initialExternalData } as AppData;
      }
       else {
        // Fallback, should ideally not be hit if loading logic is correct
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: systemTheme } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isPristineOrSharedUnsaved) {
        // For unsaved sample, pristine, or shared pages, only update local state.
        return { ...newLocalData, lastModified: baseData?.lastModified }; // Keep original lastModified if it existed
      }
      
      // For saved pages, update lastModified and save
      const newDataToSave = { ...newLocalData, lastModified: Date.now() };
      saveData(currentHashRef.current!, newDataToSave);
      return newDataToSave;
    });
  }, [saveData, pathname, initialExternalData]);

  const setPageTitle = useCallback((title: string) => {
    updateAppData({ pageTitle: title });
  }, [updateAppData]);

  const setLinkGroups = useCallback((groups: LinkGroup[]) => {
    updateAppData({ linkGroups: groups });
  }, [updateAppData]);

  const setTheme = useCallback((theme: AppData['theme']) => {
    updateAppData({ theme });
  }, [updateAppData]);

  const setCustomPrimaryColor = useCallback((color?: string) => {
    updateAppData({ customPrimaryColor: color });
  }, [updateAppData]);
  
  const createNewPageFromAppData = useCallback(() => {
    // This function is primarily for saving the sample page or a shared page preview
    if (!appData && (pathname !== '/sample' && !initialExternalData)) return null;

    const newHash = generateRandomHash();
    let dataToSave = appData ? { ...appData } : { ...defaultSampleAppData }; 

    // If saving the default sample page, or a generic shared page, give it a more specific title
    if (dataToSave.pageTitle === defaultSampleAppData.pageTitle || dataToSave.pageTitle === 'ZipGroup Shared Page') {
      dataToSave.pageTitle = `ZipGroup Page ${newHash}`;
    }
    
    dataToSave.lastModified = Date.now();
    saveData(newHash, dataToSave);
    
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('sharedData');
    const targetPath = currentUrl.pathname.replace(/^\/$/, ''); // Remove leading / for root to ensure correct path
    
    router.push(`${targetPath}/#${newHash}`); 
    
    // setCurrentHash(newHash); // The hashchange listener should handle this
    // setAppData(dataToSave); // The hashchange listener should handle this
    return newHash;
  }, [appData, saveData, router, pathname, initialExternalData]);


  const createNewBlankPageAndRedirect = useCallback(() => {
    const newHash = generateRandomHash();
    
    let dashboardThemeMode: AppData['theme'] = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    let dashboardCustomColor: string | undefined = undefined;

    if (typeof window !== 'undefined') {
        const storedThemeMode = localStorage.getItem(DASHBOARD_THEME_MODE_KEY) as AppData['theme'] | null;
        if (storedThemeMode) {
            dashboardThemeMode = storedThemeMode;
        }
        const storedCustomColor = localStorage.getItem(DASHBOARD_CUSTOM_COLOR_KEY);
        if (storedCustomColor) {
            dashboardCustomColor = storedCustomColor;
        }
    }
    
    const newPageData: AppData = { 
      ...defaultAppDataBase, 
      pageTitle: "New ZipGroup Page", // Changed from `ZipGroup Page ${newHash}`
      theme: dashboardThemeMode, 
      customPrimaryColor: dashboardCustomColor,
      lastModified: Date.now(),
    };
    saveData(newHash, newPageData); 
                                  
    router.push(`/#${newHash}`); // Navigates to the new page in the current tab
    return newHash;
  }, [saveData, router]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentHash,
    createNewPageFromAppData,
    createNewBlankPageAndRedirect,
    setCustomPrimaryColor,
  };
}
