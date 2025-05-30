
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order"; // Used by dashboard-view

export const defaultSampleAppData: Omit<AppData, 'lastModified'> = {
  pageTitle: "Explore ZipGroup - Sample Page",
  theme: 'light',
  customPrimaryColor: undefined,
  linkGroups: [
    { id: "sample-group-1", name: "Personal & Professional", icon: "Briefcase", urls: ["ofek.phd", "theofekfoundation.org"] },
    { id: "sample-group-2", name: "Foundation Projects", icon: "Library", urls: ["blog.theofekfoundation.org", "songs.theofekfoundation.org"] },
    { id: "sample-group-3", name: "Family Site", icon: "PersonStanding", urls: ["gila.family"] }, // Changed icon
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
  const pathname = usePathname(); // For /sample context
  
  const currentPageIdRef = useRef<string | null>(currentPageId);
  useEffect(() => {
    currentPageIdRef.current = currentPageId;
  }, [currentPageId]);

  const saveData = (id: string, dataToSave: AppData) => {
    if (!id) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${id}`, JSON.stringify(finalData));

      const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
      let order: string[] = orderJson ? JSON.parse(orderJson) : [];
      if (!order.includes(id)) {
        order.unshift(id); // Add new pages to the front for dashboard display
        localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
      }
    } catch (error) {
      console.error("Failed to save data to local storage:", error);
    }
  };

  const deleteData = (id: string) => {
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
  };

  const loadData = (idToLoad: string): AppData => {
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${idToLoad}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        // Ensure critical fields exist, merge with defaults if not
        return {
          pageTitle: parsedData.pageTitle || "New ZipGroup Page",
          linkGroups: parsedData.linkGroups || [],
          theme: parsedData.theme || systemTheme,
          customPrimaryColor: parsedData.customPrimaryColor,
          lastModified: parsedData.lastModified,
        };
      }
    } catch (error) {
      console.error("Failed to load/parse data from local storage for ID:", idToLoad, error);
    }
    // If no data found or error, return a default structure.
    // This should NOT save back to localStorage; that's the responsibility of updateAppData/save actions.
    return {
      ...defaultNewPageBase,
      pageTitle: "New ZipGroup Page",
      theme: systemTheme,
      customPrimaryColor: undefined,
      lastModified: undefined, // New, unloaded pages don't have a lastModified yet
    };
  };

  useEffect(() => {
    setIsLoading(true);
    setCurrentPageId(pageIdFromPath);
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (pageIdFromPath) {
      const loaded = loadData(pageIdFromPath);
      setAppData(loaded);
    } else if (initialExternalData) { // For /import or shared pages
      const pageData: AppData = {
        ...defaultNewPageBase,
        pageTitle: initialExternalData.pageTitle || "ZipGroup Shared Page",
        linkGroups: initialExternalData.linkGroups || [],
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
        lastModified: undefined, // Shared pages don't have a lastModified until saved
      };
      setAppData(pageData);
    } else if (pathname === '/sample') { // For /sample page, not persisted yet
      setAppData({
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme,
        lastModified: undefined,
      });
    } else {
      // This case should generally not be hit if called from ActualPageContent for /p/ or /import.
      // If useAppData is used elsewhere without pageId or initialData, this is a fallback.
      // For the dashboard (root '/'), useAppData is not directly used for a page's content.
      setAppData({
        ...defaultNewPageBase,
        pageTitle: "ZipGroup", // Generic fallback
        theme: systemTheme,
        lastModified: undefined,
      });
    }
    setIsLoading(false);
  }, [pageIdFromPath, initialExternalData, pathname]); // Removed loadData from deps


  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData && !isLoading) { // Ensure prevData exists or we are not in an initial loading phase
         const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
         prevData = {
            ...defaultNewPageBase,
            pageTitle: "New ZipGroup Page", // Fallback if somehow called on a completely null state
            theme: systemTheme,
            ...updates // Apply incoming updates
         };
      } else if (!prevData) {
        return null; // Still loading or no context, don't update
      }

      const newLocalData: AppData = { ...prevData, ...updates };

      if (currentPageIdRef.current) { // Only save if it's a persisted page (has a current pageId)
        const dataToSave = { ...newLocalData, lastModified: Date.now() };
        // Auto-delete if page becomes empty (no groups, default title, no custom color)
        // This check is better here than in saveData to reflect UI state accurately.
        const isEmptyDefaultPage = (!dataToSave.linkGroups || dataToSave.linkGroups.length === 0) && 
                                   dataToSave.pageTitle === "New ZipGroup Page" && 
                                   !dataToSave.customPrimaryColor;

        if (isEmptyDefaultPage) {
          deleteData(currentPageIdRef.current);
          // Potentially navigate away or inform user page was deleted due to being empty.
          // For now, just log. ActualPageContent might need to react to appData becoming effectively "deleted".
          console.log(`Page ${currentPageIdRef.current} became empty default and was removed from storage.`);
          // To reflect this deletion in the current view, we might set appData to a "deleted" state or null
          // but this can be complex. Simpler is to just not save and let UI reflect current memory state.
          return newLocalData; // Return new data, but it won't be saved if it was deleted
        } else {
          saveData(currentPageIdRef.current, dataToSave);
          return dataToSave; // Return the saved data
        }
      }
      return newLocalData; // Update in memory for unsaved pages (sample/import)
    });
  }, [isLoading, saveData, deleteData]); // Added isLoading to dependencies

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
    // When saving a sample or shared page, use its current (potentially modified) state.
    // Preserve the title from the sample/shared page.
    const dataToSave: AppData = { ...appData, lastModified: Date.now() };

    saveData(newPageId, dataToSave);
    
    const currentUrl = new URL(window.location.href);
    // Navigate to the new page, ensuring sharedData param is cleared.
    const targetUrl = `/p/${newPageId}`;
    
    if (currentUrl.searchParams.has('sharedData') && currentUrl.pathname === '/import') {
        router.push(targetUrl); // router.push will naturally clear query params if not included
    } else {
        router.push(targetUrl);
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
      pageTitle: "New ZipGroup Page", // Default title for new blank pages
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
        router.push('/'); // Redirect to home/dashboard
    }
  }, [router, deleteData]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentPageId, // This is the ID of the page if loaded via /p/[pageId]
    createNewPageFromAppData,
    createNewBlankPageAndRedirect,
    setCustomPrimaryColor,
    deleteCurrentPageAndRedirect,
  };
}
