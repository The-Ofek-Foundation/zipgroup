
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';


// For a brand new page created via root redirect or "New Page" button
const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};

// For the /sample page
const defaultSampleAppData: Omit<AppData, 'lastModified'> = {
  pageTitle: "Explore ZipGroup - Sample Page",
  theme: 'light', // Default for sample, will be overridden by system if not set
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
        if (parsedData.pageTitle && (parsedData.pageTitle.startsWith("LinkWarp Page"))) {
          parsedData.pageTitle = `ZipGroup Page ${hash}`;
        }
         // Ensure theme is always set, defaulting to system if undefined
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
      if (finalData.linkGroups && finalData.linkGroups.length === 0 && finalData.pageTitle === `ZipGroup Page ${hash}` && !finalData.customPrimaryColor) {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      } else {
         localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(finalData));
      }
    } catch (error) {
      console.error("Failed to save or remove data from local storage:", error);
    }
  }, []);

  useEffect(() => {
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialHashFromUrl = typeof window !== 'undefined' ? window.location.hash.substring(1).split('?')[0] : '';

    let dataToLoad: AppData | null = null;
    let hashToUse: string | null = initialHashFromUrl;

    if (pathname === '/sample' && !initialHashFromUrl && !initialExternalData) {
      dataToLoad = {
        ...defaultSampleAppData, 
        theme: defaultSampleAppData.theme || systemTheme, // Use sample's default or system
        customPrimaryColor: defaultSampleAppData.customPrimaryColor, // Use sample's default
      };
      hashToUse = null; 
    } else if (initialExternalData && !initialHashFromUrl) {
      dataToLoad = {
        ...defaultAppDataBase, 
        pageTitle: initialExternalData.pageTitle || `ZipGroup Shared Page`,
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
        // This case (hash exists but no data found) is for a new page created by redirect.
        // createNewBlankPageAndRedirect will have already saved initial data.
        // So, loadData should ideally find it. If not, it's an edge case.
        // We can let it proceed, and PageContent's logic will handle it.
        // For safety, we could initialize with a basic structure if loaded is null.
        dataToLoad = {
          ...defaultAppDataBase,
          pageTitle: `ZipGroup Page ${hashToUse}`,
          theme: systemTheme,
          customPrimaryColor: undefined,
        };
      }
    } else if (pathname === '/') {
      // Root path with no hash and no shared data: This will be handled by PageRouter in page.tsx
      // to show the DashboardView. useAppData doesn't need to set appData for this case.
      setIsLoading(false); // Not loading page-specific data
      setCurrentHash(null);
      setAppData(null); // No page-specific appData for dashboard view
      return; 
    } else {
      // Other paths or unhandled scenarios
      setIsLoading(false); // Or true if we expect a redirect that sets a hash
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
      const newHashValue = newHashValueWithParams.split('?')[0];

       // If navigating to the root path (which shows dashboard), clear page-specific data
      if (pathname === '/' && !newHashValue && !new URLSearchParams(window.location.search).has('sharedData')) {
        setAppData(null);
        setCurrentHash(null);
        setIsLoading(false);
        return;
      }

      if (newHashValue === currentHashRef.current && pathname !== '/sample') return; 
      
      setIsLoading(true);
      if (newHashValue) {
        const newData = loadData(newHashValue);
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (newData) {
          setAppData({ ...newData, theme: newData.theme || currentSystemTheme });
        } else {
           // This case might occur if a hash is for a page that was deleted or never existed.
           // Create a new blank page for this hash.
          const freshData: AppData = {
            ...defaultAppDataBase,
            pageTitle: `ZipGroup Page ${newHashValue}`,
            theme: currentSystemTheme,
            customPrimaryColor: undefined,
            lastModified: Date.now()
          };
          saveData(newHashValue, freshData);
          setAppData(freshData);
        }
        setCurrentHash(newHashValue);
      } else if (pathname === '/sample' && !initialExternalData) {
        const samplePageData: AppData = {
          ...defaultSampleAppData,
          theme: defaultSampleAppData.theme || window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          customPrimaryColor: defaultSampleAppData.customPrimaryColor,
        };
        setAppData(samplePageData);
        setCurrentHash(null);
      }
      setIsLoading(false);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadData, saveData, initialExternalData, pathname, router]); 

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData && currentHashRef.current === null && pathname !== '/sample') {
        return prevData;
      }
      
      const newLocalData: AppData = { 
        ...(prevData || { ...defaultSampleAppData, theme: defaultSampleAppData.theme || (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') } as AppData), 
        ...updates 
      };

      if (currentHashRef.current === null) {
        // Pristine (/sample) or shared page (unsaved): only update local state.
        return { ...newLocalData, lastModified: prevData?.lastModified };
      }
      
      const newDataToSave = { ...newLocalData, lastModified: Date.now() };
      saveData(currentHashRef.current, newDataToSave);
      return newDataToSave;
    });
  }, [saveData, pathname]);

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
    if (!appData && pathname !== '/sample') return null;

    const newHash = generateRandomHash();
    let dataToSave = { ...(appData || defaultSampleAppData) }; 

    if (dataToSave.pageTitle === defaultSampleAppData.pageTitle || dataToSave.pageTitle === 'ZipGroup Shared Page') {
      dataToSave.pageTitle = `ZipGroup Page ${newHash}`;
    }
    
    dataToSave.lastModified = Date.now();
    saveData(newHash, dataToSave);
    
    // Clear sharedData from URL after saving
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('sharedData');
    const targetPath = currentUrl.pathname + currentUrl.search; // Keep other query params if any
    
    router.push(`${targetPath}#${newHash}`); 
    
    setCurrentHash(newHash); 
    setAppData(dataToSave);

    return newHash;
  }, [appData, saveData, router, pathname, defaultSampleAppData.pageTitle]);

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
      pageTitle: `ZipGroup Page ${newHash}`, 
      theme: dashboardThemeMode, 
      customPrimaryColor: dashboardCustomColor,
      lastModified: Date.now(),
    };
    saveData(newHash, newPageData); 
                                  
    router.push(`/#${newHash}`);
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
