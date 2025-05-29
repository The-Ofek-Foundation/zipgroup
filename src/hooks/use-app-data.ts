
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
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(data));
    } catch (error)      {
      console.error("Failed to save data to local storage:", error);
    }
  }, []);

  useEffect(() => {
    const initialHash = window.location.hash.substring(1);
    let dataToLoad: AppData;
    let hashToUse = initialHash;

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (initialHash) {
      const loaded = loadData(initialHash);
      if (loaded) {
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        // No data for this hash, create new default data
        hashToUse = initialHash; // Keep the hash from the URL
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
      window.history.replaceState(null, '', `#${hashToUse}`);
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHash = window.location.hash.substring(1);
      if (newHash && newHash !== currentHashRef.current) { 
        setIsLoading(true);
        const newData = loadData(newHash);
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (newData) {
          setAppData({ ...newData, theme: newData.theme || currentSystemTheme });
        } else {
          // Navigated to a hash with no data, create new default data for this hash
          const freshData: AppData = { 
            ...defaultAppDataBase, 
            pageTitle: `ZipGroup Page ${newHash}`, 
            theme: currentSystemTheme, 
            customPrimaryColor: undefined 
          };
          saveData(newHash, freshData);
          setAppData(freshData);
        }
        setCurrentHash(newHash);
        setIsLoading(false);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);

  }, [loadData, saveData]);

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData || !currentHashRef.current) {
          console.warn("Attempted to update appData before it was fully initialized or hash was available.");
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
    window.location.hash = newHash; 
  }, [saveData, appData?.theme, appData?.customPrimaryColor]);


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
