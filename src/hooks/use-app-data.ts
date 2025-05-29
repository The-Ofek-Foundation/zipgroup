
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_"; 

// Base default data without volatile fields like pageTitle or theme specifics
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
        // Migrate old titles & set default theme if missing
        if (parsedData.pageTitle && (parsedData.pageTitle.startsWith("LinkWarp Page") || parsedData.pageTitle.startsWith("ZipGroup Page"))) {
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
      const dataToSave = { ...data, lastModified: Date.now() };
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, JSON.stringify(dataToSave));
    } catch (error)      {
      console.error("Failed to save data to local storage:", error);
    }
  }, []);

  useEffect(() => {
    const hashFromUrl = window.location.hash.substring(1).split('?')[0]; // Get only the part before '?'

    let dataToLoad: AppData;
    let hashToUse = hashFromUrl;

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (hashToUse) {
      const loaded = loadData(hashToUse);
      if (loaded) {
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        dataToLoad = { 
          ...defaultAppDataBase, 
          pageTitle: `ZipGroup Page ${hashToUse}`, 
          theme: systemTheme, 
          customPrimaryColor: undefined,
          lastModified: Date.now(),
        };
        saveData(hashToUse, dataToLoad); // Save immediately so lastModified is set
      }
    } else {
      hashToUse = generateRandomHash();
      dataToLoad = { 
        ...defaultAppDataBase, 
        pageTitle: `ZipGroup Page ${hashToUse}`,
        theme: systemTheme, 
        customPrimaryColor: undefined,
        lastModified: Date.now(),
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
            lastModified: Date.now(),
          };
          saveData(newHashValue, freshData);
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
      const newData = { ...prevData, ...updates };
      saveData(currentHashRef.current, newData); // saveData will add/update lastModified
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
    saveData(newHash, newPageData); 
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
