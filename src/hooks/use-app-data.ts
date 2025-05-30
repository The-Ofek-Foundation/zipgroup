
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // useSearchParams for clearing on import save
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";
const DASHBOARD_THEME_MODE_KEY = 'linkwarp_dashboard_theme_mode';
const DASHBOARD_CUSTOM_COLOR_KEY = 'linkwarp_dashboard_custom_primary_color';

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
  // currentPageId is the source of truth for which page this instance of the hook is managing.
  // It's derived from pageIdFromPath. If null, it's for sample/import or an unsaved new page.
  const [currentPageId, setCurrentPageId] = useState<string | null>(pageIdFromPath || null);

  const router = useRouter();
  const pathname = usePathname(); // For /sample context
  const searchParams = useSearchParams(); // For clearing sharedData query param on save
  
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
        if (parsedData.pageTitle && parsedData.pageTitle.startsWith("LinkWarp Page")) {
            parsedData.pageTitle = parsedData.pageTitle.replace("LinkWarp Page", "ZipGroup Page");
        }
        return {
          ...parsedData,
          theme: parsedData.theme || systemTheme,
        };
      }
    } catch (error) {
      console.error("Failed to load/parse data from local storage for ID:", idToLoad, error);
    }
    // If no data found or error, return a default structure for a new page.
    // This page IS NOT saved here. It's just the initial in-memory state for this ID.
    return {
      ...defaultNewPageBase,
      pageTitle: "New ZipGroup Page",
      theme: systemTheme,
      customPrimaryColor: undefined,
      lastModified: undefined,
    };
  }, []);

  // Effect for initializing appData based on props
  useEffect(() => {
    setIsLoading(true);
    setCurrentPageId(pageIdFromPath || null); // Update currentPageId based on prop
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (pageIdFromPath) {
      const loaded = loadData(pageIdFromPath);
      setAppData(loaded);
    } else if (initialExternalData) { // For /import or /sample (if initialExternalData is defaultSampleAppData)
      const pageData: AppData = {
        ...defaultNewPageBase, // Base for linkGroups
        pageTitle: initialExternalData.pageTitle || "ZipGroup Page",
        linkGroups: initialExternalData.linkGroups || [],
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
        lastModified: undefined, // Not saved yet
      };
      setAppData(pageData);
    } else {
      // This case applies if useAppData is called without pageId and without initialExternalData
      // e.g. by DashboardView for its createNewBlankPageAndRedirect action,
      // or if a /p/[pageId] route is hit where pageId is somehow null/undefined from params.
      // For ActualPageContent, this path shouldn't be hit if props are correctly passed.
      setAppData({
        ...defaultNewPageBase,
        pageTitle: "New ZipGroup Page", // A truly blank, unsaved page state
        theme: systemTheme,
        lastModified: undefined,
      });
    }
    setIsLoading(false);
  }, [pageIdFromPath, initialExternalData, loadData, pathname]); // pathname for sample context implicitly handled via initialExternalData

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData && !isLoading) { // Allow updates even if prevData is null initially during setup
         console.warn("updateAppData called possibly too early or with null prevData");
         // Create a base structure if prevData is null but we are not loading
         const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
         prevData = {
            ...defaultNewPageBase,
            pageTitle: "New ZipGroup Page",
            theme: systemTheme,
            ...updates // Apply initial updates
         };
      } else if (!prevData) {
         return null; // Still loading or error
      }

      const newLocalData: AppData = { ...prevData, ...updates };

      if (currentPageIdRef.current) {
        const dataToSave = { ...newLocalData, lastModified: Date.now() };
        if (dataToSave.linkGroups.length === 0 &&
            dataToSave.pageTitle === "New ZipGroup Page" &&
            !dataToSave.customPrimaryColor) {
          deleteData(currentPageIdRef.current);
          // Consider what appData should be after deletion. For now, null.
          // This might need a redirect or UI change in the calling component.
          return null; 
        } else {
          saveData(currentPageIdRef.current, dataToSave);
          return dataToSave;
        }
      }
      return newLocalData; // Update in memory for unsaved pages (sample/import)
    });
  }, [saveData, deleteData, isLoading]);

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

  // For saving the current in-memory appData (from sample, import, or an unsaved new page)
  const createNewPageFromAppData = useCallback(() => {
    if (!appData) {
        console.error("Cannot create new page from appData, appData is null");
        return null;
    }

    const newPageId = generateRandomHash();
    // Use the current appData (which includes user's modifications on sample/import)
    const dataToSave: AppData = { ...appData, lastModified: Date.now() };

    // If the title is still the default sample title, or a generic new page title,
    // assign a more specific new title. Otherwise, keep the user's custom title.
    if (dataToSave.pageTitle === defaultSampleAppData.pageTitle || dataToSave.pageTitle === "ZipGroup Shared Page") {
       dataToSave.pageTitle = "New ZipGroup Page"; // Keep it simple for saved sample/shared
    }
    // No need to rename if it's already "New ZipGroup Page"

    saveData(newPageId, dataToSave);
    
    // Check if we were on /import and clear its query params after saving
    const currentUrl = new URL(window.location.href);
    if (currentUrl.pathname === '/import' && currentUrl.searchParams.has('sharedData')) {
      router.push(`/p/${newPageId}`); // Navigate without old query params
    } else {
      router.push(`/p/${newPageId}`);
    }
    return newPageId;
  }, [appData, saveData, router]);

  const createNewBlankPageAndRedirect = useCallback(() => {
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
    router.push(`/p/${newPageId}`); // Navigate to the new page
    return newPageId;
  }, [router, saveData]);

  const deleteCurrentPageAndRedirect = useCallback(() => {
    if (currentPageIdRef.current) {
        deleteData(currentPageIdRef.current);
        router.push('/'); // Navigate to home/dashboard
    }
  }, [router, deleteData]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentPageId, // This is derived from pageIdFromPath prop
    createNewPageFromAppData,
    createNewBlankPageAndRedirect,
    setCustomPrimaryColor,
    deleteCurrentPageAndRedirect,
  };
}
