
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";
const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';
const JOYRIDE_SAMPLE_TAKEN_KEY = "linkwarp_joyride_sample_taken";


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
        (pathname !== '/sample' && !initialExternalData)
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
        if (!parsedData.theme) {
          parsedData.theme = systemTheme;
        }
        return parsedData;
      } else {
        const newDefaultPageData: AppData = {
            ...defaultAppDataBase,
            pageTitle: "New ZipGroup Page", // Always "New ZipGroup Page" for unknown hashes
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


  useEffect(() => {
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    let initialHashFromUrl = typeof window !== 'undefined' ? window.location.hash.substring(1).split('?')[0] : '';

    // If on /sample and hash appears, treat it as a direct navigation, not sample page anymore
    if (pathname === '/sample' && initialHashFromUrl) {
        // This case implies navigating to /sample#somehash which is not standard.
        // We'll let the hash take precedence.
    } else if (pathname === '/sample' && !initialHashFromUrl && !initialExternalData) {
      const samplePageData: AppData = {
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme,
      } as AppData;
      setAppData(samplePageData);
      setCurrentHash(null);
      setIsLoading(false);
      return; // Early exit for sample page initialization
    }

    // Handle initialExternalData (shared page)
    if (initialExternalData && !initialHashFromUrl) {
      const sharedPageData: AppData = {
        ...defaultAppDataBase,
        pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
        linkGroups: initialExternalData.linkGroups || [],
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
      } as AppData;
      setAppData(sharedPageData);
      setCurrentHash(null);
      setIsLoading(false);
      return; // Early exit for shared page initialization
    }

    // Handle hash-based loading
    if (initialHashFromUrl) {
      const loaded = loadData(initialHashFromUrl);
      setAppData(loaded ? { ...loaded, theme: loaded.theme || systemTheme } : null);
      setCurrentHash(initialHashFromUrl);
    } else {
      // This case (no hash, no sharedData, not /sample) is handled by PageRouter in page.tsx to show Dashboard
      // For useAppData, it means no specific page data context.
      setAppData(null);
      setCurrentHash(null);
    }
    setIsLoading(false);

    // Hash change listener
    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0];

      if (pathname === '/' && !newHashValue && !new URLSearchParams(window.location.search).has('sharedData')) {
        setAppData(null); // Tells PageRouter it's dashboard time
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
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const samplePageData: AppData = {
          ...defaultSampleAppData,
          theme: defaultSampleAppData.theme || currentSystemTheme,
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
  }, [loadData, saveData, initialExternalData, pathname]); // Ensure all stable dependencies are listed


  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      const isUnsavedContext = currentHashRef.current === null;
      const currentSystemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

      let baseData: AppData;
      if (prevData) {
        baseData = prevData;
      } else if (pathname === '/sample' && isUnsavedContext) { // On /sample page, not yet saved
        baseData = { ...defaultSampleAppData, theme: defaultSampleAppData.theme || currentSystemTheme } as AppData;
      } else if (isUnsavedContext && initialExternalData) { // On a shared page preview, not yet saved
         baseData = {
            ...defaultAppDataBase,
            pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
            linkGroups: initialExternalData.linkGroups || [],
            theme: initialExternalData.theme || currentSystemTheme,
            customPrimaryColor: initialExternalData.customPrimaryColor,
         } as AppData;
      } else {
        // Fallback for some other new/unsaved context (e.g. if PageRouter allowed creation of a blank page without immediate redirect)
        // This branch is less likely to be hit with current PageRouter logic for root path.
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: currentSystemTheme, lastModified: undefined } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedContext) {
        return { ...newLocalData, lastModified: baseData.lastModified }; // Keep lastModified as is, or undefined
      }

      // If there's a hash, it's a saved page, so update lastModified and save
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
    let dataToSave: AppData = { ...appData, lastModified: Date.now() };
    // No longer conditionally renaming "Explore ZipGroup - Sample Page" or "New ZipGroup Page" here.
    // It will save with the title present in appData at the time of saving.

    saveData(newHash, dataToSave);
    router.push('/#' + newHash);
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
      pageTitle: "New ZipGroup Page",
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
        router.push('/'); // Navigate to home/dashboard
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
