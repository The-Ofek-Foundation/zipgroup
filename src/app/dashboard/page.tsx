
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Home, PlusCircle, Trash2, Layers, SunMoon, Palette, Clock, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { AppData } from "@/lib/types";
import { format } from 'date-fns';

const LOCAL_STORAGE_PREFIX = "linkwarp_";

interface StoredPage {
  hash: string;
  title: string;
  linkGroupCount: number;
  theme: 'light' | 'dark';
  customPrimaryColor?: string;
  lastModified?: number;
}

export default function DashboardPage() {
  const [pages, setPages] = useState<StoredPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const loadedPages: StoredPage[] = [];
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
          try {
            const storedData = localStorage.getItem(key);
            if (storedData) {
              const parsedData = JSON.parse(storedData) as AppData;
              const hash = key.substring(LOCAL_STORAGE_PREFIX.length);
              loadedPages.push({
                hash: hash,
                title: parsedData.pageTitle || `ZipGroup Page ${hash}`,
                linkGroupCount: parsedData.linkGroups?.length || 0,
                theme: parsedData.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
                customPrimaryColor: parsedData.customPrimaryColor,
                lastModified: parsedData.lastModified,
              });
            }
          } catch (error) {
            console.error("Failed to parse page data from local storage:", key, error);
          }
        }
      }
      // Sort pages by title by default
      setPages(loadedPages.sort((a, b) => a.title.localeCompare(b.title)));
    }
    setIsLoading(false);
  }, []);

  const handleCreateNewPage = () => {
    router.push("/"); 
  };

  const handleDeletePage = (hashToDelete: string) => {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hashToDelete}`);
      setPages(prevPages => prevPages.filter(p => p.hash !== hashToDelete));
      toast({
        title: "Page Deleted",
        description: `The page "${pages.find(p => p.hash === hashToDelete)?.title || hashToDelete}" has been removed.`,
      });
    } catch (error) {
      console.error("Failed to delete page:", error);
      toast({
        title: "Error",
        description: "Could not delete the page.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl text-muted-foreground">Loading your ZipGroup pages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <Home className="h-6 w-6" />
              <h1 className="text-2xl font-semibold">ZipGroup Dashboard</h1>
            </Link>
          </div>
          <Button onClick={handleCreateNewPage} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Page
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {pages.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto h-16 w-16 text-primary mb-6" />
            <h2 className="mt-2 text-2xl font-semibold text-foreground">No ZipGroup Pages Yet</h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Looks like your dashboard is empty. Let's create your first page!
            </p>
            <Button onClick={handleCreateNewPage} className="mt-8" size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Your First Page
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pages.map(page => (
              <Card key={page.hash} className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col">
                <CardHeader className="pb-4">
                  <Link href={`/#${page.hash}`} className="block group">
                    <CardTitle className="text-xl font-semibold text-primary group-hover:underline truncate" title={page.title}>
                      {page.title}
                    </CardTitle>
                  </Link>
                  <CardDescription className="text-xs pt-1">
                    Hash: <code className="bg-muted px-1 py-0.5 rounded">{page.hash}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm flex-grow">
                  <div className="flex items-center text-muted-foreground">
                    <Layers className="mr-2 h-4 w-4" />
                    <span>{page.linkGroupCount} Link Group{page.linkGroupCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <SunMoon className="mr-2 h-4 w-4" />
                    <span>Theme: {page.theme.charAt(0).toUpperCase() + page.theme.slice(1)}</span>
                  </div>
                  {page.customPrimaryColor && (
                    <div className="flex items-center text-muted-foreground">
                      <Palette className="mr-2 h-4 w-4" />
                      <span>Custom Color: </span>
                      <span 
                        className="ml-1.5 h-4 w-4 rounded-full border" 
                        style={{ backgroundColor: page.customPrimaryColor }}
                        title={page.customPrimaryColor}
                      />
                    </div>
                  )}
                  {page.lastModified && (
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>
                        Modified: {format(new Date(page.lastModified), "MMM d, yyyy, h:mm a")}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full" aria-label={`Delete page ${page.title}`}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the page <strong className="mx-1">{page.title}</strong> (hash: {page.hash}) and all its link groups.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePage(page.hash)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          Delete Page
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Found {pages.length} page(s). Manage your ZipGroup configurations with ease.
      </footer>
    </div>
  );
}
