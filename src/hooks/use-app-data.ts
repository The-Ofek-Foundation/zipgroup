
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
  theme: 'light', // Will be overridden by system/dashboard theme if applicable
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

  const saveData = useCallback((hash: string, dataToSave: AppData) => {
    if (!hash) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      if (
        finalData.linkGroups && finalData.linkGroups.length === 0 &&
        finalData.pageTitle === "New ZipGroup Page" &&
        !finalData.customPrimaryColor &&
        (!initialExternalData && pathname !== '/sample')
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
  }, [pathname, initialExternalData]); // saveData's dependencies can be reviewed, but core logic is about localStorage

  const loadData = useCallback((hash: string): AppData | null => {
    if (!hash) return null;
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        if (parsedData.pageTitle && (parsedData.pageTitle.startsWith("LinkWarp Page"))) {
          parsedData.pageTitle = `New ZipGroup Page`;
        }
        if (!parsedData.theme) {
          parsedData.theme = systemTheme;
        }
        return parsedData;
      } else {
        const newDefaultPageData: AppData = {
            ...defaultAppDataBase,
            pageTitle: "New ZipGroup Page", // Always "New ZipGroup Page" for non-existent hashes
            theme: systemTheme,
            customPrimaryColor: undefined,
            lastModified: Date.now()
        };
        saveData(hash, newDefaultPageData);
        return newDefaultPageData;
      }
    } catch (error) {
      console.error("Failed to load data from local storage:", error);
    }
    return null;
  }, [saveData]);


  // Effect for initial load and hash changes
  useEffect(() => {
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialHashFromUrl = typeof window !== 'undefined' ? window.location.hash.substring(1).split('?')[0] : '';

    let dataToLoad: AppData | null = null;
    let hashToUse: string | null = initialHashFromUrl;

    if (pathname === '/sample' && !initialHashFromUrl && !initialExternalData) {
      dataToLoad = {
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme, // Ensure theme is set
        customPrimaryColor: defaultSampleAppData.customPrimaryColor,
        // lastModified is not set for the template itself
      } as AppData; // Cast to AppData, lastModified will be undefined
      hashToUse = null;
    } else if (initialExternalData && !initialHashFromUrl) {
      // This is for when sharedData is present and no hash
      dataToLoad = {
        ...defaultAppDataBase, // Start with base defaults
        pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
        linkGroups: initialExternalData.linkGroups || [],
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
        // lastModified will be undefined for a shared preview
      } as AppData;
      hashToUse = null;
    } else if (hashToUse) {
      const loaded = loadData(hashToUse);
      dataToLoad = loaded ? { ...loaded, theme: loaded.theme || systemTheme } : null;
    } else {
      // Root path '/' with no hash and no shared data - Dashboard will be shown by PageRouter.
      // appData remains null, isLoading might be false already or set by PageRouter.
      setIsLoading(false);
      setCurrentHash(null);
      setAppData(null);
      return;
    }

    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0];

      // This condition is for PageRouter to handle dashboard view, appData stays null
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
        setAppData(newData ? { ...newData, theme: newData.theme || currentSystemTheme } : null);
        setCurrentHash(newHashValue);
      } else if (pathname === '/sample' && !initialExternalData) {
         // If hash is removed while on /sample, reload sample data
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const samplePageData: AppData = {
          ...defaultSampleAppData,
          theme: defaultSampleAppData.theme || currentSystemTheme,
          customPrimaryColor: defaultSampleAppData.customPrimaryColor,
        } as AppData;
        setAppData(samplePageData);
        setCurrentHash(null);
      } else {
        // No hash, not /sample, and not sharedData means dashboard (handled by PageRouter)
        // or an invalid state, reset appData.
        setAppData(null);
        setCurrentHash(null);
      }
      setIsLoading(false);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadData, saveData, initialExternalData, pathname]);


  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      const isUnsavedPage = currentHashRef.current === null;

      let baseData: AppData;
      const currentSystemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

      if (prevData) {
        baseData = prevData;
      } else if (pathname === '/sample' && !currentHashRef.current) {
        baseData = { ...defaultSampleAppData, theme: defaultSampleAppData.theme || currentSystemTheme } as AppData;
      } else if (isUnsavedPage && initialExternalData) {
         baseData = { ...defaultAppDataBase, pageTitle: "ZipGroup Shared Page", theme: currentSystemTheme, ...initialExternalData } as AppData;
      } else {
        // Fallback for truly new, unsaved data if prevData is somehow null
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: currentSystemTheme, lastModified: undefined } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedPage) { // For /sample or shared preview before saving
        return { ...newLocalData, lastModified: baseData.lastModified }; // Keep lastModified as is, or undefined
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
    if (!appData) return null;

    const newHash = generateRandomHash();
    // Take current appData (which could be modified sample data, shared data, or existing page data)
    let dataToSave: AppData = { ...appData, lastModified: Date.now() };
    
    // Title is already set (e.g. "Explore ZipGroup - Sample Page" or user's title)
    // No longer renaming to "ZipGroup Page <hash>" here

    saveData(newHash, dataToSave);
    
    router.push(`/#${newHash}`);

    return newHash;
  }, [appData, saveData, router]); // Simplified dependencies


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
      pageTitle: "New ZipGroup Page",
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
