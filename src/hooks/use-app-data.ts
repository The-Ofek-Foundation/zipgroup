
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";

export const defaultSampleAppData: Omit<AppData, 'lastModified'> = {
  pageTitle: "Explore ZipGroup - Sample Page",
  theme: 'light',
  customPrimaryColor: undefined,
  linkGroups: [
    { id: "sample-group-1", name: "Personal & Professional", icon: "Briefcase", urls: ["ofek.phd", "theofekfoundation.org"] },
    { id: "sample-group-2", name: "Foundation Projects", icon: "Library", urls: ["blog.theofekfoundation.org", "songs.theofekfoundation.org"] },
    { id: "sample-group-3", name: "Family Site", icon: "Home", urls: ["gila.family"] },
  ],
};

const defaultNewPageBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};

export function useAppData(initialExternalData?: Partial<AppData>, pageIdFromPath?: string | null) {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPageId, setCurrentPageId] = useState<string | null>(pageIdFromPath || null);

  const router = useRouter();
  const pathname = usePathname();
  
  const currentPageIdRef = useRef<string | null>(currentPageId);
  useEffect(() => {
    currentPageIdRef.current = currentPageId;
  }, [currentPageId]);


  const saveData = useCallback((id: string, dataToSave: AppData) => {
    if (!id) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${id}`, JSON.stringify(finalData));

      const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
      let order: string[] = orderJson ? JSON.parse(orderJson) : [];
      if (!order.includes(id)) {
        order.unshift(id);
        localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
      }
    } catch (error) {
      console.error("Failed to save data to local storage:", error);
    }
  }, []);

  const deleteData = useCallback((id: string) => {
    if (!id) return;
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${id}`);
      const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
      if (orderJson) {
        let order = JSON.parse(orderJson) as string[];
        order = order.filter(pId => pId !== id);
        localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
      }
    } catch (error) {
      console.error("Failed to delete data from local storage:", error);
    }
  }, []);

  const loadData = useCallback((idToLoad: string): AppData => {
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${idToLoad}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        return {
          ...parsedData,
          theme: parsedData.theme || systemTheme,
        };
      }
    } catch (error) {
      console.error("Failed to load/parse data from local storage for ID:", idToLoad, error);
    }
    // If no data found or error, return a default structure for a new page.
    return {
      ...defaultNewPageBase,
      pageTitle: "New ZipGroup Page", // Default title for truly new/unfound pages
      theme: systemTheme,
      customPrimaryColor: undefined,
      lastModified: undefined,
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    if (pageIdFromPath) {
      setCurrentPageId(pageIdFromPath);
      const loaded = loadData(pageIdFromPath);
      setAppData(loaded);
    } else if (initialExternalData) { // For /import page
      setCurrentPageId(null);
      const pageData: AppData = {
        ...defaultNewPageBase,
        pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
        linkGroups: initialExternalData.linkGroups || [],
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
        lastModified: undefined,
      };
      setAppData(pageData);
    } else if (pathname === '/sample') { // For /sample page
      setCurrentPageId(null);
      setAppData({
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme, // Ensure theme from sample or system
        lastModified: undefined,
      });
    } else {
      // This case should ideally not be hit if routing is correct (e.g. dashboard at /)
      // But as a fallback, initialize a minimal state.
      setCurrentPageId(null);
      setAppData({
        ...defaultNewPageBase,
        pageTitle: "ZipGroup", // Default for an unspecified context, could be dashboard title
        theme: systemTheme,
        lastModified: undefined,
      });
    }
    setIsLoading(false);
  }, [pageIdFromPath, initialExternalData, loadData, pathname]);


  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData) {
         console.warn("updateAppData called with null prevData, this might indicate an issue.");
         // Create a base structure if prevData is null but we are not loading
         const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
         prevData = {
            ...defaultNewPageBase,
            pageTitle: "New ZipGroup Page",
            theme: systemTheme,
            ...updates
         };
      }

      const newLocalData: AppData = { ...prevData, ...updates };

      if (currentPageIdRef.current) {
        const dataToSave = { ...newLocalData, lastModified: Date.now() };
        const isEmptyDefaultPage = (!dataToSave.linkGroups || dataToSave.linkGroups.length === 0) && 
                                   dataToSave.pageTitle === "New ZipGroup Page" && 
                                   !dataToSave.customPrimaryColor;

        if (isEmptyDefaultPage) {
          deleteData(currentPageIdRef.current);
          // If we delete, we should reflect this. Consider navigating or setting appData to null.
          // For now, just log and don't save. The page component might need to handle this state.
          console.log(`Page ${currentPageIdRef.current} became empty and was not saved/deleted.`);
          return newLocalData; // Keep in-memory state, but don't persist if it's an empty default
        } else {
          saveData(currentPageIdRef.current, dataToSave);
          return dataToSave;
        }
      }
      return newLocalData; // Update in memory for unsaved pages (sample/import)
    });
  }, [saveData, deleteData]);

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
    if (!appData) {
        console.error("Cannot create new page from appData, appData is null");
        return null;
    }
    const newPageId = generateRandomHash();
    // Use the current appData (which includes user's modifications on sample/import)
    // Do not rename the pageTitle here; save it as is.
    const dataToSave: AppData = { ...appData, lastModified: Date.now() };

    saveData(newPageId, dataToSave);
    
    const currentUrl = new URL(window.location.href);
    if (currentUrl.pathname === '/import' && currentUrl.searchParams.has('sharedData')) {
      router.push(`/p/${newPageId}`); // Navigate to new page, naturally clearing query params
    } else {
      router.push(`/p/${newPageId}`);
    }
    return newPageId;
  }, [appData, saveData, router]);


  const createNewBlankPageAndRedirect = useCallback(() => {
    const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
    const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';
    let dashboardThemeMode: AppData['theme'] = 'light';
    let dashboardCustomColor: string | undefined = undefined;

    if (typeof window !== 'undefined') {
        const storedThemeMode = localStorage.getItem(DASHBOARD_THEME_MODE_KEY) as AppData['theme'] | null;
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        dashboardThemeMode = storedThemeMode || systemTheme;
        const storedCustomColor = localStorage.getItem(DASHBOARD_CUSTOM_COLOR_KEY);
        if (storedCustomColor) dashboardCustomColor = storedCustomColor;
    }

    const newPageId = generateRandomHash();
    const newPageData: AppData = {
      pageTitle: "New ZipGroup Page",
      linkGroups: [],
      theme: dashboardThemeMode,
      customPrimaryColor: dashboardCustomColor,
      lastModified: Date.now(),
    };
    saveData(newPageId, newPageData);
    router.push(`/p/${newPageId}`);
    return newPageId;
  }, [router, saveData]);

  const deleteCurrentPageAndRedirect = useCallback(() => {
    if (currentPageIdRef.current) {
        deleteData(currentPageIdRef.current);
        router.push('/');
    }
  }, [router, deleteData]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentPageId,
    createNewPageFromAppData,
    createNewBlankPageAndRedirect,
    setCustomPrimaryColor,
    deleteCurrentPageAndRedirect,
  };
}

