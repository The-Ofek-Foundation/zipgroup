
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const LOCAL_STORAGE_PREFIX = "linkwarp_";

function generateRandomHash(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

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

  const currentHashRef = useRef<string | null>(currentHash);
  useEffect(() => {
    currentHashRef.current = currentHash;
  }, [currentHash]);

  const loadData = useCallback((hash: string): AppData | null => {
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
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
        hashToUse = initialHash;
        dataToLoad = { 
          ...defaultAppDataBase, 
          pageTitle: `LinkWarp Page ${hashToUse}`, 
          theme: systemTheme, 
          customPrimaryColor: undefined 
        };
        saveData(hashToUse, dataToLoad);
      }
    } else {
      hashToUse = generateRandomHash();
      dataToLoad = { 
        ...defaultAppDataBase, 
        pageTitle: `LinkWarp Page ${hashToUse}`,
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
          const freshData: AppData = { 
            ...defaultAppDataBase, 
            pageTitle: `LinkWarp Page ${newHash}`, 
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
      pageTitle: `LinkWarp Page ${newHash}`, 
      theme: appData?.theme || currentSystemTheme, // Use current appData's theme if available
      customPrimaryColor: undefined 
    };
    saveData(newHash, newPageData);
    window.location.hash = newHash; 
  }, [saveData, appData?.theme]);


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
