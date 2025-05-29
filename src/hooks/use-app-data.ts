
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";

const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};

export function useAppData() {
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
        if (parsedData.pageTitle && (parsedData.pageTitle.startsWith("LinkWarp Page"))) {
            parsedData.pageTitle = `ZipGroup Page ${hash}`;
        }
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

  const saveData = useCallback((hash: string, data: AppData) => {
    if (!hash) return; 
    try {
      // Ensure lastModified is always set/updated before saving or deciding to remove
      const dataWithTimestamp = { ...data, lastModified: Date.now() };

      if (dataWithTimestamp.linkGroups && dataWithTimestamp.linkGroups.length === 0) {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      } else {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(dataWithTimestamp));
      }
    } catch (error) {
      console.error("Failed to save or remove data from local storage:", error);
    }
  }, []);


  useEffect(() => {
    const initialHashValueFromUrl = window.location.hash.substring(1).split('?')[0];

    let dataToLoad: AppData;
    let hashToUse = initialHashValueFromUrl;

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (hashToUse) {
      const loaded = loadData(hashToUse);
      if (loaded) {
         // If loaded data has 0 link groups, it might have been an "empty save" before the new logic.
         // The dashboard will clean it up. For current page, we load it.
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        // Hash in URL, but no data found (could be new, or was deleted due to 0 groups)
        dataToLoad = { 
          ...defaultAppDataBase, 
          pageTitle: `ZipGroup Page ${hashToUse}`, 
          theme: systemTheme, 
          customPrimaryColor: undefined,
          // lastModified will be set by saveData if it's not an empty group page
        };
        saveData(hashToUse, dataToLoad); // saveData will handle not saving if linkGroups is empty
      }
    } else {
      hashToUse = generateRandomHash();
      dataToLoad = { 
        ...defaultAppDataBase, 
        pageTitle: `ZipGroup Page ${hashToUse}`,
        theme: systemTheme, 
        customPrimaryColor: undefined,
        // lastModified will be set by saveData
      };
      saveData(hashToUse, dataToLoad);
      const currentPathAndQuery = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', `${currentPathAndQuery}#${hashToUse}`);
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHashValue = window.location.hash.substring(1).split('?')[0];

      if (newHashValue && newHashValue !== currentHashRef.current) { 
        setIsLoading(true);
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
            // lastModified will be set by saveData
          };
          saveData(newHashValue, freshData); // saveData handles empty case
          setAppData(freshData);
        }
        setCurrentHash(newHashValue);
        setIsLoading(false);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);

  }, [loadData, saveData, pathname]); 

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData || !currentHashRef.current) {
          return prevData; 
      }
      // Ensure lastModified is updated with every change.
      // saveData will handle the actual persistence logic (including deleting if empty)
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
  
  const createNewPage = useCallback(() => {
    const newHash = generateRandomHash();
    const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    const newPageData: AppData = { 
      ...defaultAppDataBase,
      pageTitle: `ZipGroup Page ${newHash}`, 
      theme: appData?.theme || currentSystemTheme, 
      customPrimaryColor: appData?.customPrimaryColor,
      // lastModified will be set by saveData
    };
    saveData(newHash, newPageData); // saveData will handle empty case, but new pages start empty.
                                  // So, it won't be saved until a link group is added.
                                  // This means the user will be redirected to #newHash,
                                  // which will then effectively "create" it in memory.
                                  // If they add a group, it saves. If not, it vanishes from storage.
    const currentPathAndQuery = window.location.pathname + window.location.search;
    window.location.href = `${currentPathAndQuery}#${newHash}`;
  }, [saveData, appData?.theme, appData?.customPrimaryColor, pathname]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentHash,
    createNewPage,
    setCustomPrimaryColor,
  };
}

