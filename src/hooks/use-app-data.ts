
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation'; // Keep useRouter and usePathname for potential future use or if createNewPage still uses them
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";

const defaultPristinePageTitle = "New ZipGroup Page";

// This base is for when a new page is created or loaded from a hash that doesn't exist yet.
// It does not include pageTitle, theme, or customPrimaryColor as those depend on context.
const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};


export function useAppData(initialExternalData?: Partial<AppData>) {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  
  const router = useRouter(); // Keep for potential future use
  const pathname = usePathname(); // Keep for potential future use

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
        if (parsedData.pageTitle && (parsedData.pageTitle.startsWith("LinkWarp Page"))) {
          parsedData.pageTitle = `ZipGroup Page ${hash}`;
        }
        // Ensure theme is set, defaulting to system if not present
        if (!parsedData.theme) {
          parsedData.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
      if (finalData.linkGroups && finalData.linkGroups.length === 0) {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      } else {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(finalData));
      }
    } catch (error) {
      console.error("Failed to save or remove data from local storage:", error);
    }
  }, []);

  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialHashFromUrl = window.location.hash.substring(1).split('?')[0];

    let dataToLoad: AppData;
    let hashToUse = initialHashFromUrl;

    if (initialExternalData && !initialHashFromUrl) {
      // Case 1: Incoming shared data, no existing hash in URL
      dataToLoad = {
        ...defaultAppDataBase,
        pageTitle: initialExternalData.pageTitle || defaultPristinePageTitle,
        linkGroups: initialExternalData.linkGroups || [],
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
        // lastModified will be set when the user saves this shared page
      };
      hashToUse = null; // Explicitly mark as no hash yet
    } else if (hashToUse) {
      // Case 2: Hash in URL, try to load existing data
      const loaded = loadData(hashToUse);
      if (loaded) {
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        // Hash in URL, but no data found (new page, or was cleared)
        dataToLoad = {
          ...defaultAppDataBase,
          pageTitle: `ZipGroup Page ${hashToUse}`,
          theme: systemTheme,
          customPrimaryColor: undefined,
        };
        // Don't save yet if it's truly new and empty, save will happen on first modification or explicit save.
        // However, if we land here via a direct link to a non-existent hash, we treat it as a new page for that hash.
      }
    } else {
      // Case 3: No hash in URL, no shared data - pristine page
      dataToLoad = {
        ...defaultAppDataBase,
        pageTitle: defaultPristinePageTitle,
        theme: systemTheme,
        customPrimaryColor: undefined,
      };
      hashToUse = null; // Explicitly mark as no hash yet
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHashValue = window.location.hash.substring(1).split('?')[0];
      if (newHashValue === currentHashRef.current) return; // No actual change in hash

      setIsLoading(true);
      if (newHashValue) {
        const newData = loadData(newHashValue);
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (newData) {
          setAppData({ ...newData, theme: newData.theme || currentSystemTheme });
        } else {
          // Navigated to a new hash that has no data
          const freshData: AppData = {
            ...defaultAppDataBase,
            pageTitle: `ZipGroup Page ${newHashValue}`,
            theme: currentSystemTheme,
            customPrimaryColor: undefined,
          };
          setAppData(freshData);
          // Don't save yet; it's effectively a new page for this hash
        }
        setCurrentHash(newHashValue);
      } else {
        // Hash was removed from URL, go to pristine state
        const pristineData: AppData = {
          ...defaultAppDataBase,
          pageTitle: defaultPristinePageTitle,
          theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          customPrimaryColor: undefined,
        };
        setAppData(pristineData);
        setCurrentHash(null);
      }
      setIsLoading(false);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData, initialExternalData]); // Removed saveData from deps, it's stable

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData) return prevData;
      const newData = { ...prevData, ...updates };
      if (currentHashRef.current) { // Only save if there's an active hash (not pristine/shared preview)
        saveData(currentHashRef.current, newData);
      }
      return newData;
    });
  }, [saveData]);

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
    if (!appData) return null; // Should not happen if button is clickable

    const newHash = generateRandomHash();
    let dataToSave = { ...appData };

    // If title is still the default pristine, update it
    if (dataToSave.pageTitle === defaultPristinePageTitle || !dataToSave.pageTitle) {
      dataToSave.pageTitle = `ZipGroup Page ${newHash}`;
    }
    
    dataToSave.lastModified = Date.now();
    
    saveData(newHash, dataToSave);
    
    // Update URL. The hashchange listener will then load this new page.
    // Also clear any sharedData query param if this was a shared page being saved.
    const newPath = pathname + '#' + newHash; // router.pathname is just '/'
    window.history.pushState(null, '', newPath); // Change URL without full reload, hashchange will trigger
    // Manually trigger hash processing if needed, or rely on hashchange event
    setCurrentHash(newHash); // Update currentHash immediately
    setAppData(dataToSave); // Update appData to reflect the saved state with new hash context

    // Clean URL from sharedData if it was present
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('sharedData')) {
        currentUrl.searchParams.delete('sharedData');
        window.history.replaceState(null, '', currentUrl.pathname + currentUrl.hash);
    }


    return newHash;
  }, [appData, saveData, pathname]);

  // This function is for the "New Page" button in the header, creating a blank new page.
  const createNewBlankPage = useCallback(() => {
    const newHash = generateRandomHash();
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    const newPageData: AppData = { 
      ...defaultAppDataBase,
      pageTitle: `ZipGroup Page ${newHash}`, 
      theme: appData?.theme || systemTheme, 
      customPrimaryColor: appData?.customPrimaryColor, // Inherit from current page if available
      lastModified: Date.now(),
    };
    // Note: saveData will handle not saving if linkGroups is empty,
    // but we create a new page with a timestamp and title, so it should be saved
    // to exist until the user adds groups or it's cleaned up.
    saveData(newHash, newPageData); 
                                  
    // Navigate to this new hash. The hashchange listener will load it.
    const newPath = pathname + '#' + newHash;
    window.location.href = newPath; // Full navigation to trigger hashchange and potential re-render via Next router if it picks it up
  }, [saveData, appData?.theme, appData?.customPrimaryColor, pathname]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentHash,
    createNewPageFromAppData, // For "Save This Page" or "Save Shared Page"
    createNewBlankPage, // For "New Page" button in header
    setCustomPrimaryColor,
  };
}
