
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils"; // Renamed or use as is for ID generation

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
    { id: "sample-group-1", name: "Personal & Professional", icon: "Briefcase", urls: ["ofek.phd", "theofekfoundation.org"] },
    { id: "sample-group-2", name: "Foundation Projects", icon: "Library", urls: ["blog.theofekfoundation.org", "songs.theofekfoundation.org"] },
    { id: "sample-group-3", name: "Family Site", icon: "Home", urls: ["gila.family"] },
  ],
};

// pageId prop is the ID from the URL path, e.g., for /p/[pageId]
// initialExternalData is for loading shared data via query param
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

  const saveData = (id: string, dataToSave: AppData) => {
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

  const loadData = (id: string): AppData | null => {
    if (!id) return null;
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${id}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        if (parsedData.pageTitle && parsedData.pageTitle.startsWith("LinkWarp Page")) {
            parsedData.pageTitle = parsedData.pageTitle.replace("LinkWarp Page", "ZipGroup Page");
        }
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        return {
          ...parsedData,
          theme: parsedData.theme || systemTheme,
        };
      } else {
        // If no data found for this ID, return a default new page structure.
        // DO NOT save it here. Saving happens on user interaction.
        const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        return {
          ...defaultAppDataBase,
          pageTitle: "New ZipGroup Page", // Default for a truly new/unknown page ID
          theme: systemTheme,
          customPrimaryColor: undefined,
          lastModified: undefined, // Will be set on first save
        };
      }
    } catch (error) {
      console.error("Failed to load data from local storage for ID:", id, error);
    }
    return null;
  };

  // Centralized logic to set appData based on context
  const _resolveAndSetAppData = useCallback((currentPath: string, idForPage: string | null, sharedData?: Partial<AppData>) => {
    setIsLoading(true);
    const systemTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (currentPath === '/sample' && !idForPage && !sharedData) {
      const samplePageData: AppData = {
        ...defaultSampleAppData,
        theme: defaultSampleAppData.theme || systemTheme,
      } as AppData;
      setAppData(samplePageData);
      setCurrentPageId(null);
    } else if (sharedData && !idForPage) { // Shared data preview (typically loaded on root, then handled by ActualPageContent)
      const sharedPageData: AppData = {
        ...defaultAppDataBase,
        pageTitle: sharedData.pageTitle || "ZipGroup Shared Page",
        linkGroups: sharedData.linkGroups || [],
        theme: sharedData.theme || systemTheme,
        customPrimaryColor: sharedData.customPrimaryColor,
        lastModified: undefined,
      };
      setAppData(sharedPageData);
      setCurrentPageId(null);
    } else if (idForPage) { // A specific page ID from path /p/[pageId]
      const loaded = loadData(idForPage);
      setAppData(loaded);
      setCurrentPageId(idForPage);
    } else {
      // This case should ideally not be hit by ActualPageContent if pageIdFromPath is always provided
      // For other contexts (like useAppData in DashboardView, if any) or if it's a new page scenario.
      setAppData(null); // Or a minimal default if needed for Dashboard
      setCurrentPageId(null);
    }
    setIsLoading(false);
  }, [loadData]); // loadData is stable


  useEffect(() => {
    // This effect handles the initial data resolution based on props
    _resolveAndSetAppData(pathname, pageIdFromPath, initialExternalData);
  }, [pathname, pageIdFromPath, initialExternalData, _resolveAndSetAppData]);


  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      const isUnsavedContext = currentPageIdRef.current === null; // Sample page or shared preview before save
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
      } else { // Fallback for a completely new, unsaved context (e.g., if a new page was started but not yet saved)
        baseData = { ...defaultAppDataBase, pageTitle: "New ZipGroup Page", theme: currentSystemTheme, lastModified: undefined } as AppData;
      }

      const newLocalData: AppData = { ...baseData, ...updates };

      if (isUnsavedContext) {
        return { ...newLocalData, lastModified: baseData.lastModified };
      }

      const newDataToSave = { ...newLocalData, lastModified: Date.now() };
      if (currentPageIdRef.current &&
          newDataToSave.linkGroups.length === 0 &&
          newDataToSave.pageTitle === "New ZipGroup Page" &&
          !newDataToSave.customPrimaryColor) {
        deleteData(currentPageIdRef.current);
        return null;
      } else {
        saveData(currentPageIdRef.current!, newDataToSave);
        return newDataToSave;
      }
    });
  }, [pathname, initialExternalData, saveData, deleteData]);

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

    const newPageId = generateRandomHash(); // Use your ID generation function
    const dataToSave: AppData = {
      ...appData,
      pageTitle: appData.pageTitle, // Retain current title (from sample, shared, or edited new page)
      lastModified: Date.now()
    };
    // Logic to rename generic sample title if it was not edited was removed in previous step
    // Now it respects the current title of the sample/shared page
    saveData(newPageId, dataToSave);
    router.push(`/p/${newPageId}`); // Navigate to the new page using path-based routing
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
      pageTitle: "New ZipGroup Page", // Default title for truly blank pages
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
    currentPageId,
    createNewPageFromAppData,
    createNewBlankPageAndRedirect,
    setCustomPrimaryColor,
    deleteCurrentPageAndRedirect,
  };
}
