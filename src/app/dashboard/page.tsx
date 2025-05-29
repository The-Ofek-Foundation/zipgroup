
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Home, PlusCircle, Trash2, Layers, SunMoon, Palette, Clock, FileText, GripVertical } from "lucide-react";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";

const LOCAL_STORAGE_PREFIX = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";

interface StoredPage {
  hash: string;
  title: string;
  linkGroupCount: number;
  theme: 'light' | 'dark';
  customPrimaryColor?: string;
  lastModified?: number;
}

interface SortablePageCardItemProps {
  page: StoredPage;
  onDelete: (hash: string) => void;
}

function SortablePageCardItem({ page, onDelete }: SortablePageCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.hash });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease', // Ensure transition is applied if transform is null initially
  };

  // Clicks on buttons should not initiate a drag
  const stopPropagation = (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-manipulation relative", // Added relative for absolute positioning of drag handle
        isDragging ? "z-50 opacity-75 shadow-2xl ring-2 ring-primary" : "z-auto"
      )}
    >
      {/* Drag handle button positioned at top-right of the card */}
       <Button
        variant="ghost"
        size="icon"
        {...attributes} // Spread DND attributes for dragging
        {...listeners} // Spread DND listeners for drag initiation
        className="absolute top-1 right-1 z-10 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-100 focus:opacity-100 transition-opacity hidden md:inline-flex"
        aria-label="Drag to reorder page"
        onPointerDown={stopPropagation} // Allow button interaction without drag starting on the handle itself
      >
        <GripVertical className="h-5 w-5" />
      </Button>
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
        <CardHeader className="pb-4">
          <Link href={`/#${page.hash}`} className="block group" onClick={stopPropagation} onKeyDown={stopPropagation} tabIndex={0}>
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
              <Button variant="destructive" size="sm" className="w-full" aria-label={`Delete page ${page.title}`} onPointerDown={stopPropagation} onClick={stopPropagation}>
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
                  onClick={() => onDelete(page.hash)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Delete Page
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}


export default function DashboardPage() {
  const [pages, setPages] = useState<StoredPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const allLoadedPages: StoredPage[] = [];
    let initialStoredOrder: string[] = [];

    if (typeof window !== 'undefined') {
      try {
        const orderJson = localStorage.getItem(DASHBOARD_ORDER_KEY);
        if (orderJson) {
          initialStoredOrder = JSON.parse(orderJson);
        }
      } catch (error) {
        console.error("Failed to parse page order from local storage:", error);
        initialStoredOrder = [];
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_PREFIX) && key !== DASHBOARD_ORDER_KEY) {
          try {
            const storedData = localStorage.getItem(key);
            if (storedData) {
              const parsedData = JSON.parse(storedData) as AppData;
              const hash = key.substring(LOCAL_STORAGE_PREFIX.length);

              if (!parsedData.linkGroups || parsedData.linkGroups.length === 0) {
                localStorage.removeItem(key); 
                // Also remove from initialStoredOrder if it exists there
                initialStoredOrder = initialStoredOrder.filter(h => h !== hash);
                continue; 
              }

              allLoadedPages.push({
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

      // Reconcile initialStoredOrder with actually existing pages
      const existingPageHashes = new Set(allLoadedPages.map(p => p.hash));
      const validStoredOrder = initialStoredOrder.filter(hash => existingPageHashes.has(hash));
      
      if (validStoredOrder.length !== initialStoredOrder.length) {
         localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(validStoredOrder));
      }

      // Sort pages: first by validStoredOrder, then by lastModified (newest first), then by title
      const pageMap = new Map(allLoadedPages.map(p => [p.hash, p]));
      const finalPages: StoredPage[] = [];
      const processedHashes = new Set<string>();

      for (const hash of validStoredOrder) {
        const page = pageMap.get(hash);
        if (page) {
          finalPages.push(page);
          processedHashes.add(hash);
        }
      }
      
      const remainingPages = allLoadedPages.filter(p => !processedHashes.has(p.hash));
      remainingPages.sort((a, b) => {
        if (a.lastModified && b.lastModified) {
          return b.lastModified - a.lastModified;
        }
        if (a.lastModified) return -1;
        if (b.lastModified) return 1;
        return a.title.localeCompare(b.title);
      });

      setPages([...finalPages, ...remainingPages]);
    }
    setIsLoading(false);
  }, []);

  const handleCreateNewPage = () => {
    router.push("/");
  };

  const handleDeletePage = (hashToDelete: string) => {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${hashToDelete}`);
      setPages(prevPages => {
        const newPages = prevPages.filter(p => p.hash !== hashToDelete);
        const newOrder = newPages.map(p => p.hash);
        localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(newOrder));
        return newPages;
      });
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndPages = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setPages((currentPages) => {
        const oldIndex = currentPages.findIndex((p) => p.hash === active.id);
        const newIndex = currentPages.findIndex((p) => p.hash === over.id);
        if (oldIndex === -1 || newIndex === -1) return currentPages;

        const reorderedPages = arrayMove(currentPages, oldIndex, newIndex);
        const newOrderOfHashes = reorderedPages.map(p => p.hash);
        if (typeof window !== 'undefined') {
          localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(newOrderOfHashes));
        }
        return reorderedPages;
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
              Looks like your dashboard is empty. Let's create your first page or add some link groups!
            </p>
            <Button onClick={handleCreateNewPage} className="mt-8" size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Your First Page
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndPages}>
            <SortableContext items={pages.map(p => p.hash)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pages.map(page => (
                  <SortablePageCardItem key={page.hash} page={page} onDelete={handleDeletePage} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Found {pages.length} page(s) with link groups. Manage your ZipGroup configurations with ease.
      </footer>
    </div>
  );
}

    