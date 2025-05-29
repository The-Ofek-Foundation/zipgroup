
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Home, PlusCircle, Trash2 } from "lucide-react";
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

const LOCAL_STORAGE_PREFIX = "linkwarp_";

interface StoredPage {
  hash: string;
  title: string;
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
              });
            }
          } catch (error) {
            console.error("Failed to parse page data from local storage:", key, error);
          }
        }
      }
      setPages(loadedPages.sort((a, b) => a.title.localeCompare(b.title)));
    }
    setIsLoading(false);
  }, []);

  const handleCreateNewPage = () => {
    router.push("/"); // Navigates to main page, useAppData will handle new page creation
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Loading pages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80">
              <Home className="h-6 w-6" />
              <h1 className="text-2xl font-semibold">ZipGroup Dashboard</h1>
            </Link>
          </div>
          <Button onClick={handleCreateNewPage} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New ZipGroup Page
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {pages.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h2 className="mt-2 text-xl font-semibold text-foreground">No pages found</h2>
            <p className="mt-1 text-muted-foreground">
              Get started by creating a new ZipGroup page.
            </p>
            <Button onClick={handleCreateNewPage} className="mt-6">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Page
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map(page => (
              <Card key={page.hash} className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-grow min-w-0">
                    <Link href={`/#${page.hash}`} className="block group">
                      <h3 className="text-lg font-medium text-primary group-hover:underline truncate" title={page.title}>
                        {page.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hash: <code className="bg-muted px-1 py-0.5 rounded">{page.hash}</code>
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 flex-shrink-0" aria-label={`Delete page ${page.title}`}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the page
                          <strong className="mx-1">{page.title}</strong>
                          (hash: {page.hash}) and all its link groups.
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Found {pages.length} page(s). Easily manage and access your ZipGroup configurations.
      </footer>
    </div>
  );
}

