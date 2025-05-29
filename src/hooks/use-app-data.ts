
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order"; // Used by dashboard-view
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
        // Migration from old name "LinkWarp" to "ZipGroup"
        if (parsedData.pageTitle && (parsedData.pageTitle.startsWith("LinkWarp Page"))) {
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
  }, [pathname, initialExternalData]);

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
      } as AppData; // Cast to AppData as lastModified is not included in defaultSampleAppData
      hashToUse = null;
    } else if (initialExternalData && !initialHashFromUrl) { // This is for shared pages
      dataToLoad = {
        ...defaultAppDataBase,
        pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
        linkGroups: initialExternalData.linkGroups || [],
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
      } as AppData; // Ensure type consistency
      hashToUse = null;
    } else if (hashToUse) { // Existing page accessed via hash
      const loaded = loadData(hashToUse);
      if (loaded) {
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        // If hash exists but no data, create a new page for that hash
        dataToLoad = {
          ...defaultAppDataBase,
          pageTitle: `ZipGroup Page ${hashToUse}`,
          theme: systemTheme,
          customPrimaryColor: undefined,
          lastModified: Date.now()
        };
        saveData(hashToUse, dataToLoad); // Save this newly created page
      }
    } else {
      // This is hit if pathname is not '/sample', no hash, and no initialExternalData
      // e.g. when PageRouter on '/' decides to show DashboardView, appData remains null
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

      // If navigating to the root path (shows dashboard/home) and no sharedData, clear page-specific data
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
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const samplePageData: AppData = {
          ...defaultSampleAppData,
          theme: defaultSampleAppData.theme || currentSystemTheme,
          customPrimaryColor: defaultSampleAppData.customPrimaryColor,
        } as AppData;
        setAppData(samplePageData);
        setCurrentHash(null);
      } else {
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
      if (prevData) {
        baseData = prevData;
      } else if (pathname === '/sample' && !currentHashRef.current) {
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        baseData = { ...defaultSampleAppData, theme: defaultSampleAppData.theme || systemTheme } as AppData;
      } else if (isUnsavedPage && initialExternalData) {
         const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
         baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: systemTheme, ...initialExternalData } as AppData;
      } else {
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: systemTheme, lastModified: Date.now() } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedPage) {
        // For unsaved sample, pristine, or shared pages, only update local state.
        return { ...newLocalData, lastModified: baseData?.lastModified };
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
    // For saving /sample or a shared page preview to the user's dashboard
    if (!appData) return null;

    const newHash = generateRandomHash();
    let dataToSave = { ...appData };

    // Removed the conditional title override:
    // dataToSave.pageTitle = `ZipGroup Page ${newHash}`;

    dataToSave.lastModified = Date.now();
    saveData(newHash, dataToSave);

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('sharedData'); // Ensure sharedData is cleared

    // Use router.push to navigate and trigger hashchange listener
    router.push(`${currentUrl.pathname.replace(/^\/$/, '')}/#${newHash}`);

    return newHash;
  }, [appData, saveData, router]);


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
