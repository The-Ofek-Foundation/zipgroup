
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Using navigation hooks for App Router

const LOCAL_STORAGE_PREFIX = "linkwarp_";

function generateRandomHash(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

const defaultAppData: Omit<AppData, 'theme' | 'customPrimaryColor'> & { theme?: AppData['theme'], customPrimaryColor?: AppData['customPrimaryColor'] } = {
  pageTitle: "LinkWarp Dashboard",
  linkGroups: [],
};

export function useAppData() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  const loadData = useCallback((hash: string): AppData | null => {
    try {
      const storedData = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as AppData;
        // Ensure theme exists, default if not
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
        dataToLoad = { ...defaultAppData, theme: systemTheme, customPrimaryColor: undefined };
        saveData(hashToUse, dataToLoad);
      }
    } else {
      hashToUse = generateRandomHash();
      dataToLoad = { ...defaultAppData, theme: systemTheme, customPrimaryColor: undefined };
      saveData(hashToUse, dataToLoad);
      window.history.replaceState(null, '', `#${hashToUse}`);
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHash = window.location.hash.substring(1);
      if (newHash && newHash !== currentHashRef.current) { // Use ref for currentHash in listener
        const newData = loadData(newHash);
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (newData) {
          setAppData({ ...newData, theme: newData.theme || currentSystemTheme });
          setCurrentHash(newHash);
        } else {
          const freshData: AppData = { ...defaultAppData, theme: currentSystemTheme, customPrimaryColor: undefined };
          saveData(newHash, freshData);
          setAppData(freshData);
          setCurrentHash(newHash);
        }
      }
    };
    
    // Ref to hold currentHash for the event listener to avoid stale closures
    const currentHashRef = React.useRef(currentHash);
    useEffect(() => {
      currentHashRef.current = currentHash;
    }, [currentHash]);

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);

  }, [loadData, saveData]);

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

  const setCustomPrimaryColor = useCallback((color?: string) => {
    updateAppData({ customPrimaryColor: color });
  }, [updateAppData]);
  
  const createNewPage = useCallback(() => {
    const newHash = generateRandomHash();
    const newPageData: AppData = { 
      ...defaultAppData, 
      theme: appData?.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
      customPrimaryColor: undefined // Reset custom color for new page
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

// Minimal React import for useRef
import React from 'react';
