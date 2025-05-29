
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order"; // Used by dashboard-view
const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode'; // Used by this hook
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color'; // Used by this hook
const JOYRIDE_SAMPLE_TAKEN_KEY = "linkwarp_joyride_sample_taken"; // Used by sample page


const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};

export const defaultSampleAppData: Omit<AppData, 'lastModified'> = {
  pageTitle: "Explore ZipGroup - Sample Page",
  theme: 'light', // Default, can be overridden by system preference in hook
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
  const pathname = usePathname(); // Get current pathname

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
        finalData.pageTitle === "New ZipGroup Page" && // Only remove truly blank new pages
        !finalData.customPrimaryColor &&
        (pathname !== '/sample' && !initialExternalData) // Don't auto-delete sample or shared previews if they become "empty"
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
  }, [pathname, initialExternalData]);

  const loadData = useCallback((hash: string): AppData | null => {
    if (!hash) return null;
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        return {
          ...parsedData,
          theme: parsedData.theme || systemTheme, // Ensure theme is set
        };
      } else {
        // If no data for hash, create a new default page for this hash
        const newDefaultPageData: AppData = {
            ...defaultAppDataBase,
            pageTitle: "New ZipGroup Page", // Default title for unknown hash
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

  const _resolveAndSetAppData = useCallback((currentPath: string, hashFromUrl: string | null, externalData?: Partial<AppData>) => {
    setIsLoading(true);
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (currentPath === '/sample' && !hashFromUrl && !externalData) {
      const samplePageData: AppData = {
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme,
      } as AppData;
      setAppData(samplePageData);
      setCurrentHash(null);
    } else if (externalData && !hashFromUrl) {
      const sharedPageData: AppData = {
        ...defaultAppDataBase,
        pageTitle: externalData.pageTitle || "ZipGroup Shared Page",
        linkGroups: externalData.linkGroups || [],
        theme: externalData.theme || systemTheme,
        customPrimaryColor: externalData.customPrimaryColor,
      } as AppData; // lastModified will be undefined until saved
      setAppData(sharedPageData);
      setCurrentHash(null);
    } else if (hashFromUrl) {
      const loaded = loadData(hashFromUrl);
      setAppData(loaded); // loadData ensures theme is set
      setCurrentHash(hashFromUrl);
    } else {
      // This case is typically for when PageRouter decides to show Dashboard
      // or an uninitialized state before redirection.
      setAppData(null);
      setCurrentHash(null);
    }
    setIsLoading(false);
  }, [loadData]);


  useEffect(() => {
    if (typeof window === 'undefined') return; // Ensure this only runs client-side

    const initialHashValue = window.location.hash.substring(1).split('?')[0] || null;
    _resolveAndSetAppData(pathname, initialHashValue, initialExternalData);

    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0] || null;
      
      // For hash changes, initialExternalData is not relevant.
      // We also need to pass the current pathname.
      _resolveAndSetAppData(window.location.pathname, newHashValue, undefined);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [pathname, initialExternalData, _resolveAndSetAppData]); // pathname and initialExternalData for initial load


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
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: currentSystemTheme, lastModified: undefined } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedContext) {
        return { ...newLocalData, lastModified: baseData.lastModified };
      }

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
    // When saving from sample or shared, use the current appData
    // Title will be what's in appData (e.g., "Explore ZipGroup - Sample Page" or user-edited)
    const dataToSave: AppData = { ...appData, lastModified: Date.now() };

    saveData(newHash, dataToSave);
    router.push('/#' + newHash); // Navigates to the new hash on the root page
    return newHash;
  }, [appData, saveData, router]);


  const createNewBlankPageAndRedirect = useCallback(() => {
    const newHash = generateRandomHash();

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

    const newPageData: AppData = {
      ...defaultAppDataBase,
      pageTitle: "New ZipGroup Page", // Always "New ZipGroup Page" for truly blank pages
      theme: dashboardThemeMode,
      customPrimaryColor: dashboardCustomColor,
      lastModified: Date.now(),
    };
    saveData(newHash, newPageData);

    router.push(`/#${newHash}`);
    return newHash;
  }, [saveData, router]);

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
        router.push('/');
      } catch (error) {
        console.error("Failed to delete page or update dashboard order:", error);
      }
    }
  }, [router]);


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
