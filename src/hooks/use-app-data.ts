
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_"; 

// Base default data without volatile fields like pageTitle or theme specifics
const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor'> = {
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
    if (!hash) return null; // Do not attempt to load with an empty hash
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        // Migrate old titles
        if (parsedData.pageTitle && parsedData.pageTitle.startsWith("LinkWarp Page")) {
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
    if (!hash) return; // Do not attempt to save with an empty hash
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(data));
    } catch (error)      {
      console.error("Failed to save data to local storage:", error);
    }
  }, []);

  useEffect(() => {
    const hashWithOptionalQuery = window.location.hash.substring(1);
    const [initialHashValueFromUrl] = hashWithOptionalQuery.split('?'); // Get only the part before '?'

    let dataToLoad: AppData;
    let hashToUse = initialHashValueFromUrl;

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (hashToUse) {
      const loaded = loadData(hashToUse);
      if (loaded) {
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        // No data for this hash, create new default data
        dataToLoad = { 
          ...defaultAppDataBase, 
          pageTitle: `ZipGroup Page ${hashToUse}`, 
          theme: systemTheme, 
          customPrimaryColor: undefined 
        };
        saveData(hashToUse, dataToLoad);
      }
    } else {
      // No hash in URL, generate new page
      hashToUse = generateRandomHash();
      dataToLoad = { 
        ...defaultAppDataBase, 
        pageTitle: `ZipGroup Page ${hashToUse}`,
        theme: systemTheme, 
        customPrimaryColor: undefined 
      };
      saveData(hashToUse, dataToLoad);
      // Construct the new URL carefully to only update the hash part
      const currentPath = window.location.pathname + window.location.search; // Keep existing path and query params
      window.history.replaceState(null, '', `${currentPath}#${hashToUse}`);
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHashWithOptionalQuery = window.location.hash.substring(1);
      const [newHashValue] = newHashWithOptionalQuery.split('?');

      if (newHashValue && newHashValue !== currentHashRef.current) { 
        setIsLoading(true);
        const newData = loadData(newHashValue);
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (newData) {
          setAppData({ ...newData, theme: newData.theme || currentSystemTheme });
        } else {
          // Navigated to a hash with no data, create new default data for this hash
          const freshData: AppData = { 
            ...defaultAppDataBase, 
            pageTitle: `ZipGroup Page ${newHashValue}`, 
            theme: currentSystemTheme, 
            customPrimaryColor: undefined 
          };
          saveData(newHashValue, freshData);
          setAppData(freshData);
        }
        setCurrentHash(newHashValue);
        setIsLoading(false);
      } else if (!newHashValue && currentHashRef.current) {
        // Hash was removed, potentially re-generate or decide on a default behavior
        // For now, let's assume this scenario means we might need to create a new page
        // or redirect. This logic might need further refinement based on desired UX.
        // console.log("Hash removed from URL.");
        // Potentially call createNewPage() or redirect to a default state.
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);

  }, [loadData, saveData, pathname]); // Added pathname to deps for replaceState

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData || !currentHashRef.current) {
          // console.warn("Attempted to update appData before it was fully initialized or hash was available.");
          return prevData; 
      }
      const newData = { ...prevData, ...updates };
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
      customPrimaryColor: appData?.customPrimaryColor 
    };
    saveData(newHash, newPageData);
    // Construct the new URL carefully to only update the hash part
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `${currentPath}#${newHash}`; // Use href to trigger hashchange and reload
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
