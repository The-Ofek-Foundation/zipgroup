
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order"; // Also used in dashboard-view
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

  const saveData = (hash: string, dataToSave: AppData) => {
    if (!hash) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(finalData));
      
      // Ensure this page is in the dashboard order
      const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
      let order: string[] = [];
      if (orderJson) {
        try {
          order = JSON.parse(orderJson);
        } catch { /* ignore parse error, start fresh */ }
      }
      if (!order.includes(hash)) {
        order.unshift(hash); // Add new/updated pages to the front
        localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
      }

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
    
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        // Simple migration for old page titles if necessary
        if (parsedData.pageTitle && parsedData.pageTitle.startsWith("LinkWarp Page")) {
            parsedData.pageTitle = parsedData.pageTitle.replace("LinkWarp Page", "ZipGroup Page");
        }
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        return {
          ...parsedData,
          theme: parsedData.theme || systemTheme, // Ensure theme exists
        };
      } else { // No stored data found for this hash
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const newDefaultPageData: AppData = {
          ...defaultAppDataBase,
          pageTitle: "New ZipGroup Page",
          theme: systemTheme,
          customPrimaryColor: undefined,
          lastModified: Date.now() // Set lastModified, it will be persisted if user edits
        };
        // DO NOT SAVE HERE. Let user interaction trigger save via updateAppData.
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
      } as AppData; // Cast to AppData as lastModified might be missing
      setAppData(samplePageData);
      setCurrentHash(null);
    } else if (sharedDataParam && !hash) {
      const sharedPageData: AppData = {
        ...defaultAppDataBase,
        pageTitle: sharedDataParam.pageTitle || "ZipGroup Shared Page",
        linkGroups: sharedDataParam.linkGroups || [],
        theme: sharedDataParam.theme || systemTheme,
        customPrimaryColor: sharedDataParam.customPrimaryColor,
        // lastModified will be undefined, set upon saving
      };
      setAppData(sharedPageData);
      setCurrentHash(null);
    } else if (hash) {
      const loaded = loadData(hash);
      setAppData(loaded);
      setCurrentHash(hash);
    } else {
      // This case is primarily for the PageRouter deciding to show Dashboard.
      // ActualPageContent shouldn't be rendered if appData is null here.
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
      // When hash changes, initialExternalData is not relevant from URL for this specific listener
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
        // This path should ideally not be hit if ActualPageContent isn't rendered without appData.
        // But if it is, provide a very basic default.
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: currentSystemTheme, lastModified: undefined } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedContext) { // For /sample page or shared page preview before saving
        return { ...newLocalData, lastModified: baseData.lastModified }; // Keep original lastModified
      }

      // If it's a saved page (currentHash exists), update lastModified and save
      const newDataToSave = { ...newLocalData, lastModified: Date.now() };

      // Auto-delete "empty" pages only if they were previously saved and now become conventionally empty
      if (currentHashRef.current &&
          newDataToSave.linkGroups.length === 0 &&
          newDataToSave.pageTitle === "New ZipGroup Page" && // Specific default title check
          !newDataToSave.customPrimaryColor // And no custom color
          // We don't check theme, as it could be user's preference even for an "empty" page
          ) {
        deleteData(currentHashRef.current);
        // router.push('/'); // Optionally redirect, or let parent component handle UI for deleted page.
        // Returning null might be problematic if the component expects AppData.
        // Consider how UI should react. For now, let it clear from storage.
        return null; 
      } else {
        saveData(currentHashRef.current!, newDataToSave);
        return newDataToSave;
      }
    });
  }, [pathname, initialExternalData, saveData, deleteData]); // Dependencies for updateAppData

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

  const createNewPageFromAppData = useCallback(() => { // For saving sample or shared page
    if (!appData) return null;

    const newHash = generateRandomHash();
    const dataToSave: AppData = {
      ...appData,
      pageTitle: appData.pageTitle, // Keep the title from sample/shared or user edit
      lastModified: Date.now()
    };

    saveData(newHash, dataToSave);
    router.push('/#' + newHash); // This should trigger PageRouter to render ActualPageContent with new hash
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
      pageTitle: "New ZipGroup Page",
      linkGroups: [],
      theme: dashboardThemeMode,
      customPrimaryColor: dashboardCustomColor,
      lastModified: Date.now(),
    };
    saveData(newHash, newPageData);
    router.push(`/#${newHash}`);
    return newHash;
  }, [router, saveData]);

  const deleteCurrentPageAndRedirect = useCallback(() => {
    if (currentHashRef.current) {
        deleteData(currentHashRef.current);
        router.push('/'); // Navigate to home/dashboard
    }
  }, [router, deleteData]);


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
