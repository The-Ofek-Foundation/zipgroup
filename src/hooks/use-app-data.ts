
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
  const [currentHash, setCurrentHash] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const currentHashRef = useRef<string | null>(null);
  useEffect(() => {
    currentHashRef.current = currentHash;
  }, [currentHash]);

  // Not using useCallback for these internal helpers to ensure they are fresh
  // when the main useEffect in useAppData re-runs due to prop changes.
  const saveData = (hash: string, dataToSave: AppData) => {
    if (!hash) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      // This specific check for deleting empty sample pages was problematic.
      // Deletion of empty pages should be handled by updateAppData or dashboard load.
      // For now, saveData will always save if dataToSave is provided.
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(finalData));
    } catch (error) {
      console.error("Failed to save data to local storage:", error);
    }
  };

  const deleteData = (hash: string) => {
    if (!hash) return;
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
      if (orderJson) {
          let order = JSON.parse(orderJson) as string[];
          order = order.filter(h => h !== hash);
          localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
      }
    } catch (error) {
        console.error("Failed to delete data from local storage:", error);
    }
  };


  const loadData = (hash: string): AppData | null => {
    if (!hash) return null;
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        // Simple migration for old page titles if necessary
        if (parsedData.pageTitle && parsedData.pageTitle.startsWith("LinkWarp Page")) {
            parsedData.pageTitle = parsedData.pageTitle.replace("LinkWarp Page", "ZipGroup Page");
        }
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
  };


  const _resolveAndSetAppData = (path: string, hash: string | null, sharedDataParam?: Partial<AppData>) => {
    setIsLoading(true);
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (path === '/sample' && !hash && !sharedDataParam) {
      const samplePageData: AppData = {
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme,
      } as AppData;
      setAppData(samplePageData);
      setCurrentHash(null);
    } else if (sharedDataParam && !hash) {
      const sharedPageData: AppData = {
        ...defaultAppDataBase,
        pageTitle: sharedDataParam.pageTitle || "ZipGroup Shared Page",
        linkGroups: sharedDataParam.linkGroups || [],
        theme: sharedDataParam.theme || systemTheme,
        customPrimaryColor: sharedDataParam.customPrimaryColor,
      };
      setAppData(sharedPageData);
      setCurrentHash(null);
    } else if (hash) {
      const loaded = loadData(hash);
      setAppData(loaded);
      setCurrentHash(hash);
    } else {
      setAppData(null);
      setCurrentHash(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    _resolveAndSetAppData(pathname, explicitRouteHash, initialExternalData);

    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0] || null;
      _resolveAndSetAppData(window.location.pathname, newHashValue, undefined);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [pathname, explicitRouteHash, initialExternalData]);


  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      const isUnsavedContext = currentHashRef.current === null;
      const currentSystemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

      let baseData: AppData;
      if (prevData) {
        baseData = prevData;
      } else if (pathname === '/sample' && isUnsavedContext) {
        baseData = { ...defaultSampleAppData, theme: defaultSampleAppData.theme || currentSystemTheme } as AppData;
      } else if (isUnsavedContext && initialExternalData) {
         baseData = {
            ...defaultAppDataBase,
            pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
            linkGroups: initialExternalData.linkGroups || [],
            theme: initialExternalData.theme || currentSystemTheme,
            customPrimaryColor: initialExternalData.customPrimaryColor,
         } as AppData;
      } else {
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: currentSystemTheme } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedContext) {
        return { ...newLocalData, lastModified: baseData.lastModified };
      }

      // Auto-delete "empty" pages (only if they were previously saved)
      if (currentHashRef.current &&
          newLocalData.linkGroups.length === 0 &&
          newLocalData.pageTitle === "New ZipGroup Page" && // Check against the specific default new page title
          !newLocalData.customPrimaryColor) {
        deleteData(currentHashRef.current); // Use helper for deletion
        return null; // Or handle UI state for deleted page appropriately
      } else {
        const newDataToSave = { ...newLocalData, lastModified: Date.now() };
        saveData(currentHashRef.current!, newDataToSave);
        return newDataToSave;
      }
    });
  }, [pathname, initialExternalData]); // Removed saveData, loadData from deps as they are stable now

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
    const dataToSave: AppData = {
      ...appData,
      lastModified: Date.now()
    };
    // Retain current title (e.g. sample page title or shared page title)
    saveData(newHash, dataToSave);
    router.push('/#' + newHash);
    return newHash;
  }, [appData, router]); // Removed saveData from deps

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
      pageTitle: "New ZipGroup Page",
      linkGroups: [],
      theme: dashboardThemeMode,
      customPrimaryColor: dashboardCustomColor,
      lastModified: Date.now(),
    };
    saveData(newHash, newPageData);
    router.push(`/#${newHash}`);
    return newHash;
  }, [router]); // Removed saveData from deps

  const deleteCurrentPageAndRedirect = useCallback(() => {
    if (currentHashRef.current) {
        deleteData(currentHashRef.current);
        router.push('/');
    }
  }, [router]); // Removed deleteData from deps


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
    deleteCurrentPageAndRedirect,
  };
}
