
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";
const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';


const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};

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


export function useAppData(initialExternalData?: Partial<AppData>, explicitRouteHash?: string | null) {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // currentHash is the hash this instance of useAppData believes it's managing.
  // It's primarily set by _resolveAndSetAppData based on explicitRouteHash or initial load.
  const [currentHash, setCurrentHash] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname(); 

  const currentHashRef = useRef<string | null>(null);
  useEffect(() => {
    currentHashRef.current = currentHash;
  }, [currentHash]);

  const saveData = useCallback((hash: string, dataToSave: AppData) => {
    if (!hash) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      const isSamplePageContext = pathname === '/sample' && !initialExternalData && !currentHashRef.current;

      if (
        !isSamplePageContext && // Don't auto-delete the sample page if it becomes "empty" before first save
        finalData.linkGroups && finalData.linkGroups.length === 0 &&
        finalData.pageTitle === "New ZipGroup Page" && 
        !finalData.customPrimaryColor
      ) {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
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
  }, [pathname, initialExternalData]); // Dependencies of saveData

  const loadData = useCallback((hash: string): AppData | null => {
    if (!hash) return null;
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        return {
          ...parsedData,
          theme: parsedData.theme || systemTheme, 
        };
      } else {
        const newDefaultPageData: AppData = {
            ...defaultAppDataBase,
            pageTitle: "New ZipGroup Page", 
            theme: systemTheme,
            customPrimaryColor: undefined,
            lastModified: Date.now()
        };
        saveData(hash, newDefaultPageData);
        return newDefaultPageData;
      }
    } catch (error) {
      console.error("Failed to load data from local storage for hash:", hash, error);
    }
    return null;
  }, [saveData]);


  const _resolveAndSetAppData = useCallback((path: string, hash: string | null, sharedData?: Partial<AppData>) => {
    setIsLoading(true);
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (path === '/sample' && !hash && !sharedData) {
      const samplePageData: AppData = {
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme,
      } as AppData; // lastModified will be undefined for unsaved sample
      setAppData(samplePageData);
      setCurrentHash(null); // Sample page doesn't have a hash until saved
    } else if (sharedData && !hash) { // A shared link preview
      const sharedPageData: AppData = {
        ...defaultAppDataBase,
        pageTitle: sharedData.pageTitle || "ZipGroup Shared Page",
        linkGroups: sharedData.linkGroups || [],
        theme: sharedData.theme || systemTheme,
        customPrimaryColor: sharedData.customPrimaryColor,
        // lastModified will be undefined for unsaved shared preview
      };
      setAppData(sharedPageData);
      setCurrentHash(null); // Shared preview doesn't have a hash for the current user yet
    } else if (hash) { // A page with a hash
      const loaded = loadData(hash);
      setAppData(loaded); 
      setCurrentHash(hash);
    } else { 
      // This case is for when PageRouter decides to show Dashboard (no hash, no sharedData, not /sample)
      // Or an uninitialized state for a truly new page before redirection.
      // For ActualPageContent, if it ever gets here without a hash/sharedData, it should be loading the dashboard.
      // useAppData when called from DashboardView will also hit this if no specific hash passed.
      setAppData(null); // No specific page data to load for dashboard context or a truly blank new page
      setCurrentHash(null);
    }
    setIsLoading(false);
  }, [loadData]); // Dependencies of _resolveAndSetAppData


  useEffect(() => {
    // This effect now primarily relies on explicitRouteHash from props to determine its data.
    // The handleHashChange listener inside this effect will update based on window.location.hash for other navigations.
    _resolveAndSetAppData(pathname, explicitRouteHash, initialExternalData);

    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0] || null;
      // When hash changes, initialExternalData is not relevant for _resolveAndSetAppData.
      // It should re-resolve based on the new hash or lack thereof.
      // Pass window.location.pathname in case the path also changed, though less common with hash nav.
      _resolveAndSetAppData(window.location.pathname, newHashValue, undefined);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [pathname, explicitRouteHash, initialExternalData, _resolveAndSetAppData]);


  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      // currentHashRef.current is the hash this useAppData instance is managing or null if it's an unsaved state
      const isUnsavedContext = currentHashRef.current === null; 
      const currentSystemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

      let baseData: AppData;
      if (prevData) {
        baseData = prevData;
      } else if (pathname === '/sample' && isUnsavedContext) {
        baseData = { ...defaultSampleAppData, theme: defaultSampleAppData.theme || currentSystemTheme } as AppData;
      } else if (isUnsavedContext && initialExternalData) { // Shared page context
         baseData = {
            ...defaultAppDataBase,
            pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
            linkGroups: initialExternalData.linkGroups || [],
            theme: initialExternalData.theme || currentSystemTheme,
            customPrimaryColor: initialExternalData.customPrimaryColor,
         } as AppData; // lastModified is undefined
      } else { // Fallback for a new page scenario if somehow prevData is null but not sample/shared
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: currentSystemTheme, lastModified: undefined } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedContext) { // If it's sample, shared preview, or a truly new blank page not yet saved
        return { ...newLocalData, lastModified: baseData.lastModified }; // Keep lastModified as is (likely undefined)
      }

      // Only save to localStorage if there's a currentHash (i.e., it's a saved page)
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
    if (!appData) return null; // Should not happen if called from UI where appData is present

    const newHash = generateRandomHash();
    // Use the current state of appData (which could be from sample, shared, or user-edited pristine)
    const dataToSave: AppData = { 
      ...appData, 
      pageTitle: appData.pageTitle, // Retain the current title (e.g. "Explore ZipGroup - Sample Page")
      lastModified: Date.now() 
    };
    
    saveData(newHash, dataToSave);
    router.push('/#' + newHash); // Navigate to the new hash on the root page
    // Clear sharedData param if it was part of the original URL (less common now with new PageRouter logic)
    // This router.push to a hash naturally clears query params if not included.
    return newHash;
  }, [appData, saveData, router]);


  const createNewBlankPageAndRedirect = useCallback(() => {
    let dashboardThemeMode: AppData['theme'] = 'light';
    let dashboardCustomColor: string | undefined = undefined;

    if (typeof window !== 'undefined') {
        const storedThemeMode = localStorage.getItem(DASHBOARD_THEME_MODE_KEY) as AppData['theme'] | null;
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        dashboardThemeMode = storedThemeMode || systemTheme;

        const storedCustomColor = localStorage.getItem(DASHBOARD_CUSTOM_COLOR_KEY);
        if (storedCustomColor) {
            dashboardCustomColor = storedCustomColor;
        }
    }

    const newHash = generateRandomHash();
    const newPageData: AppData = {
      pageTitle: "New ZipGroup Page", // Always "New ZipGroup Page"
      linkGroups: [],
      theme: dashboardThemeMode,
      customPrimaryColor: dashboardCustomColor,
      lastModified: Date.now(),
    };
    saveData(newHash, newPageData);

    router.push(`/#${newHash}`);
    return newHash;
  }, [saveData, router]); // saveData and router are dependencies

  const deleteCurrentPageAndRedirect = useCallback(() => {
    if (currentHashRef.current) {
      try {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${currentHashRef.current}`);
        
        const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
        if (orderJson) {
          let order = JSON.parse(orderJson) as string[];
          order = order.filter(h => h !== currentHashRef.current);
          localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
        }
        router.push('/'); // Navigate to home/dashboard
      } catch (error) {
        console.error("Failed to delete page or update dashboard order:", error);
      }
    }
  }, [router]); // router is a dependency


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentHash, // The hash this instance is managing
    createNewPageFromAppData, // For saving sample/shared or user-modified pristine state
    createNewBlankPageAndRedirect, // For creating a truly blank new page
    setCustomPrimaryColor,
    deleteCurrentPageAndRedirect,
  };
}
