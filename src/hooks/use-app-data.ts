
"use client";

import type { AppData, LinkGroup } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { generateRandomHash } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";

// For a brand new page created via root redirect or "New Page" button
const defaultAppDataBase: Omit<AppData, 'pageTitle' | 'theme' | 'customPrimaryColor' | 'lastModified'> = {
  linkGroups: [],
};

// For the /sample page
const defaultSampleAppData: Omit<AppData, 'lastModified' | 'customPrimaryColor' | 'theme'> = {
  pageTitle: "Explore ZipGroup - Sample Page",
  linkGroups: [
    {
      id: "sample-group-1",
      name: "Personal & Professional",
      icon: "Briefcase",
      urls: [
        "ofek.phd",
        "theofekfoundation.org",
      ],
    },
    {
      id: "sample-group-2",
      name: "Foundation Projects",
      icon: "Library",
      urls: [
        "blog.theofekfoundation.org",
        "songs.theofekfoundation.org",
      ],
    },
    {
      id: "sample-group-3",
      name: "Family Site",
      icon: "Home",
      urls: [
        "gila.family",
      ],
    },
  ],
};


export function useAppData(initialExternalData?: Partial<AppData>) {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname

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

  const saveData = useCallback((hash: string, dataToSave: AppData) => {
    if (!hash) return;
    try {
      const finalData = { ...dataToSave, lastModified: Date.now() };
      if (finalData.linkGroups && finalData.linkGroups.length === 0 && finalData.pageTitle === `ZipGroup Page ${hash}`) {
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

    let dataToLoad: AppData | null = null; // Initialize to null
    let hashToUse: string | null = initialHashFromUrl;

    if (pathname === '/sample' && !initialHashFromUrl && !initialExternalData) {
      // Case 1: On /sample path, no hash, no shared data - load sample data
      dataToLoad = {
        ...defaultSampleAppData, 
        theme: systemTheme,
        customPrimaryColor: undefined,
      };
      hashToUse = null; 
    } else if (initialExternalData && !initialHashFromUrl) {
      // Case 2: Incoming shared data (on any path, typically /), no existing hash in URL
      dataToLoad = {
        ...defaultAppDataBase, 
        pageTitle: initialExternalData.pageTitle || `ZipGroup Shared Page`,
        linkGroups: initialExternalData.linkGroups || [], 
        theme: initialExternalData.theme || systemTheme,
        customPrimaryColor: initialExternalData.customPrimaryColor,
      };
      hashToUse = null; 
    } else if (hashToUse) {
      // Case 3: Hash in URL, try to load existing data
      const loaded = loadData(hashToUse);
      if (loaded) {
        dataToLoad = { ...loaded, theme: loaded.theme || systemTheme };
      } else {
        dataToLoad = {
          ...defaultAppDataBase,
          pageTitle: `ZipGroup Page ${hashToUse}`,
          theme: systemTheme,
          customPrimaryColor: undefined, 
        };
      }
    } else if (pathname === '/') {
      // Case 4: On root path, no hash, no shared data. PageContent will handle redirect.
      // For useAppData, we just set a loading state until redirect happens.
      setIsLoading(true);
      setAppData(null);
      setCurrentHash(null);
      return; // Early exit, expect redirect
    } else {
      // Case 5: Other paths, or unhandled scenarios - default to loading.
      // This case should be rare if routing is managed properly.
      setIsLoading(true);
      setAppData(null);
      setCurrentHash(null);
      return; // Early exit
    }
    
    setAppData(dataToLoad);
    setCurrentHash(hashToUse);
    setIsLoading(false);

    const handleHashChange = () => {
      const newHashValueWithParams = window.location.hash.substring(1);
      const newHashValue = newHashValueWithParams.split('?')[0];

      if (newHashValue === currentHashRef.current && pathname !== '/sample') return; // Prevent re-load if hash is same, unless on /sample (which has no hash initially)
      
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
      } else if (pathname === '/sample' && !initialExternalData) {
         // Navigated to /sample without hash (e.g. from dashboard)
        const samplePageData: AppData = {
          ...defaultSampleAppData,
          theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          customPrimaryColor: undefined,
        };
        setAppData(samplePageData);
        setCurrentHash(null);
      } else if (pathname === '/') {
         // Navigated to / without hash. Should be handled by RootRedirector.
         // For safety, reset to a loading state or minimal default.
        setIsLoading(true);
        setAppData(null);
        setCurrentHash(null);
      }
      setIsLoading(false);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadData, initialExternalData, pathname, router]); 

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => {
      if (!prevData && currentHashRef.current === null && pathname !== '/sample') {
        // If prevData is null and we're not on the sample page,
        // this usually means we're in a transient state before a redirect or proper load.
        // Avoid setting partial data.
        return prevData;
      }
      
      const newLocalData = { ...(prevData || defaultSampleAppData), ...updates }; // Fallback to defaultSample if prevData is null on /sample

      if (currentHashRef.current === null) {
        // Pristine (/sample) or shared page (unsaved): only update local state.
        return { ...newLocalData, lastModified: prevData?.lastModified };
      }
      
      const newDataToSave = { ...newLocalData, lastModified: Date.now() };
      saveData(currentHashRef.current, newDataToSave);
      return newDataToSave;
    });
  }, [saveData, pathname]);

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
    if (!appData && pathname !== '/sample') return null; // Guard against no appData unless on sample page

    const newHash = generateRandomHash();
    // Use current appData from state, which includes modifications if on sample page
    // or the original shared data if on a shared preview.
    let dataToSave = { ...(appData || defaultSampleAppData) }; // Fallback to defaultSample if appData somehow null on /sample

    if (dataToSave.pageTitle === defaultSampleAppData.pageTitle) {
      dataToSave.pageTitle = `ZipGroup Page ${newHash}`;
    }
    
    dataToSave.lastModified = Date.now();
    saveData(newHash, dataToSave);
    
    const targetUrl = `/#${newHash}`;
    router.push(targetUrl); 
    
    // After pushing, state should update via hashchange or direct set.
    // We might want to ensure appData and currentHash are updated immediately for consistent UX.
    setCurrentHash(newHash); 
    setAppData(dataToSave);

    return newHash;
  }, [appData, saveData, router, pathname]);

  const createNewBlankPageAndRedirect = useCallback(() => {
    const newHash = generateRandomHash();
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    const newPageData: AppData = { 
      ...defaultAppDataBase, 
      pageTitle: `ZipGroup Page ${newHash}`, 
      theme: systemTheme, 
      customPrimaryColor: undefined,
      lastModified: Date.now(),
    };
    saveData(newHash, newPageData); 
                                  
    router.push(`/#${newHash}`);
    return newHash;
  }, [saveData, router]);


  return {
    isLoading,
    appData,
    setPageTitle,
    setLinkGroups,
    setTheme,
    currentHash,
    createNewPageFromAppData,
    createNewBlankPageAndRedirect, // Exposed for root page
    setCustomPrimaryColor,
  };
}
