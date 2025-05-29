"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Using navigation hooks for App Router

const LOCAL_STORAGE_PREFIX = "linkwarp_";

function generateRandomHash(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

const defaultAppData: Omit<AppData, 'theme'> = {
  pageTitle: "LinkWarp Dashboard",
  linkGroups: [],
};

export function useAppData() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  // For App Router, hash is not directly available via hooks, need to access window.location.hash

  const loadData = useCallback((hash: string): AppData | null => {
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        return JSON.parse(storedData) as AppData;
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
    // This effect runs only on the client
    const initialHash = window.location.hash.substring(1); // Remove #
    let dataToLoad: AppData;
    let hashToUse = initialHash;

    if (initialHash) {
      const loaded = loadData(initialHash);
      if (loaded) {
        dataToLoad = loaded;
      } else {
        // Hash exists but no data, create new data for this hash
        hashToUse = initialHash; // Keep the user's hash
        dataToLoad = { ...defaultAppData, theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' };
        saveData(hashToUse, dataToLoad);
      }
    } else {
      // No hash, generate new one and save default data
      hashToUse = generateRandomHash();
      dataToLoad = { ...defaultAppData, theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' };
      saveData(hashToUse, dataToLoad);
      window.history.replaceState(null, '', `#${hashToUse}`);
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHash = window.location.hash.substring(1);
      if (newHash && newHash !== currentHash) {
        const newData = loadData(newHash);
        if (newData) {
          setAppData(newData);
          setCurrentHash(newHash);
        } else {
          // If new hash has no data, create it (or redirect to a new hash)
          const freshData = { ...defaultAppData, theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' };
          saveData(newHash, freshData);
          setAppData(freshData);
          setCurrentHash(newHash);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);

  }, [loadData, saveData, currentHash]); // Added currentHash to dependencies of hashchange listener setup

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData || !currentHash) return prevData;
      const newData = { ...prevData, ...updates };
      saveData(currentHash, newData);
      return newData;
    });
  }, [currentHash, saveData]);

  const setPageTitle = useCallback((title: string) => {
    updateAppData({ pageTitle: title });
  }, [updateAppData]);

  const setLinkGroups = useCallback((groups: LinkGroup[]) => {
    updateAppData({ linkGroups: groups });
  }, [updateAppData]);

  const setTheme = useCallback((theme: AppData['theme']) => {
    updateAppData({ theme });
  }, [updateAppData]);
  
  const createNewPage = useCallback(() => {
    const newHash = generateRandomHash();
    const newPageData: AppData = { ...defaultAppData, theme: appData?.theme || 'light' };
    saveData(newHash, newPageData);
    window.location.hash = newHash; // This will trigger hashchange and reload data
  }, [saveData, appData?.theme]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentHash,
    createNewPage,
  };
}
