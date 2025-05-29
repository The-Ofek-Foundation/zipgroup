
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";

const defaultPristinePageTitle = "New ZipGroup Page";

// Default sample data for a brand new user experience
const defaultSampleAppData: Omit<AppData, 'lastModified' | 'customPrimaryColor' | 'theme'> = {
  pageTitle: "Explore ZipGroup - Sample Page",
  linkGroups: [
    {
      id: "sample-group-1",
      name: "Personal & Professional",
      icon: "Briefcase",
      urls: [
        "https://ofek.phd",
        "https://theofekfoundation.org",
      ],
    },
    {
      id: "sample-group-2",
      name: "Foundation Projects",
      icon: "Library",
      urls: [
        "https://blog.theofekfoundation.org",
        "https://songs.theofekfoundation.org",
      ],
    },
    {
      id: "sample-group-3",
      name: "Family Site",
      icon: "Home",
      urls: [
        "https://gila.family",
      ],
    },
  ],
};


// This base is for when a new page is created or loaded from a hash that doesn't exist yet.
// It does not include pageTitle, theme, or customPrimaryColor as those depend on context.
const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
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
        // Migration for old title format
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
      if (finalData.linkGroups && finalData.linkGroups.length === 0 && finalData.pageTitle === `ZipGroup Page ${hash}`) {
        // If groups are empty AND title is still the default for this hash, remove it.
        // This prevents empty "ZipGroup Page <hash>" pages from being kept if never really used.
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      } else if (finalData.linkGroups && finalData.linkGroups.length === 0 && finalData.pageTitle !== `ZipGroup Page ${hash}`) {
        // If groups are empty but title is custom, still save it. Or if there are link groups.
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(finalData));
      } else if (finalData.linkGroups && finalData.linkGroups.length > 0) {
         localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(finalData));
      } else {
        // Catch-all, likely means title is default and groups are empty - so remove
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      }
    } catch (error) {
      console.error("Failed to save or remove data from local storage:", error);
    }
  }, []);

  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialHashFromUrl = window.location.hash.substring(1).split('?')[0];

    let dataToLoad: AppData;
    let hashToUse: string | null = initialHashFromUrl;

    if (initialExternalData && !initialHashFromUrl) {
      // Case 1: Incoming shared data, no existing hash in URL
      dataToLoad = {
        ...defaultAppDataBase, // Provides linkGroups: []
        pageTitle: initialExternalData.pageTitle || defaultPristinePageTitle, // Use shared title or a default
        linkGroups: initialExternalData.linkGroups || [], // Use shared link groups
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
          customPrimaryColor: undefined, // No custom color for a truly new page from hash
        };
      }
    } else {
      // Case 3: No hash in URL, no shared data - show sample page
      dataToLoad = {
        ...defaultSampleAppData, // This now includes sample title and linkGroups
        theme: systemTheme,
        customPrimaryColor: undefined,
      };
      hashToUse = null; // Explicitly mark as no hash yet
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0];

      if (newHashValue === currentHashRef.current) return;

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
          };
          setAppData(freshData);
        }
        setCurrentHash(newHashValue);
      } else {
        // Hash was removed from URL, or navigating to root path from a hash
        // Go to pristine sample page state
        const pristineData: AppData = {
          ...defaultSampleAppData,
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
  }, [loadData, initialExternalData]); 

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData) return prevData; // Should not happen if UI is loaded
      
      // If currentHash is null (pristine/shared page), only update local state, don't save to localStorage yet.
      if (currentHashRef.current === null) {
        return { ...prevData, ...updates, lastModified: prevData.lastModified }; // Keep lastModified as is, or undefined
      }
      
      // If there's a hash, update local state AND save to localStorage
      const newData = { ...prevData, ...updates, lastModified: Date.now() };
      saveData(currentHashRef.current, newData);
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
    if (!appData) return null;

    const newHash = generateRandomHash();
    let dataToSave = { ...appData };

    // If the page title of the data to be saved is the default sample page title,
    // or if it's the generic "New ZipGroup Page" (from an old pristine state),
    // then update it to be specific to the new hash.
    if (dataToSave.pageTitle === defaultSampleAppData.pageTitle || dataToSave.pageTitle === defaultPristinePageTitle) {
      dataToSave.pageTitle = `ZipGroup Page ${newHash}`;
    }
    
    dataToSave.lastModified = Date.now();
    saveData(newHash, dataToSave);
    
    // Update URL. The hashchange listener will then load this new page.
    const newPathAndHash = pathname + '#' + newHash; 
    // Use history.pushState to change hash without triggering a full page reload but still allowing hashchange listener to pick it up
    window.history.pushState(null, '', newPathAndHash); 
    
    // Manually trigger parts of hashchange logic to update state immediately
    // as hashchange event might be async or not fire reliably with pushState in all scenarios.
    setCurrentHash(newHash); 
    setAppData(dataToSave);

    // Clean URL from sharedData if it was present
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('sharedData')) {
        currentUrl.searchParams.delete('sharedData');
        window.history.replaceState(null, '', currentUrl.pathname + currentUrl.hash);
    }
    return newHash;
  }, [appData, saveData, pathname]);


  const createNewBlankPage = useCallback(() => {
    const newHash = generateRandomHash();
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    const newPageData: AppData = { 
      ...defaultAppDataBase, // Starts with linkGroups: []
      pageTitle: `ZipGroup Page ${newHash}`, 
      theme: appData?.theme || systemTheme, 
      customPrimaryColor: appData?.customPrimaryColor,
      lastModified: Date.now(),
    };
    // saveData will handle not saving if linkGroups is empty and title is still default.
    // However, for a "New Page" action, we usually want it to exist at least temporarily.
    // The current saveData logic might remove it if linkGroups remains empty.
    // For now, we'll save it, and if it's not modified, it might be cleaned up by dashboard later.
    saveData(newHash, newPageData); 
                                  
    const newPathAndHash = pathname + '#' + newHash;
    window.location.href = newPathAndHash; 
  }, [saveData, appData?.theme, appData?.customPrimaryColor, pathname]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentHash,
    createNewPageFromAppData,
    createNewBlankPage,
    setCustomPrimaryColor,
  };
}
