
"use client";

import type { LinkGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import LucideIcon from "@/components/icons/lucide-icon";
import { ExternalLink, Edit3, Trash2, Link as LinkIcon, AppWindow } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LinkGroupCardProps {
  group: LinkGroup;
  onOpen: (group: LinkGroup) => void;
  onEdit: (group: LinkGroup) => void;
  onDelete: (group: LinkGroup) => void;
  onOpenInNewWindow: (group: LinkGroup) => void;
  isDragging?: boolean;
}

export function LinkGroupCard({ group, onOpen, onEdit, onDelete, onOpenInNewWindow, isDragging }: LinkGroupCardProps) {
  const { toast } = useToast();

  const handleOpenLinks = () => {
    if (group.urls.length === 0) {
      toast({
        title: "No URLs",
        description: "This group has no URLs to open.",
        variant: "default",
      });
      return;
    }
    onOpen(group);
    group.urls.forEach(url => {
      try {
        new URL(url);
        window.open(url, "_blank");
      } catch (e) {
        console.warn(`Invalid URL skipped: ${url}`);
        toast({
          title: "Invalid URL",
          description: `Skipped invalid URL: ${url}`,
          variant: "destructive",
        });
      }
    });
     toast({
        title: "Links Opening",
        description: `Attempting to open ${group.urls.length} link(s) in new tabs. Check your popup blocker if they don't appear.`,
      });
  };

  const handleOpenInNewWindowClick = () => {
    if (group.urls.length === 0) {
      toast({
        title: "No URLs",
        description: "This group has no URLs to open for the new window.",
        variant: "default",
      });
      return;
    }
    onOpenInNewWindow(group);
  };

  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className={cn(
      "flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300",
      isDragging && "ring-2 ring-primary shadow-2xl opacity-75 z-50"
    )}>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <div className="p-2 bg-primary/10 rounded-md">
          <LucideIcon name={group.icon} className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-xl">{group.name}</CardTitle>
          <CardDescription className="flex items-center">
            <LinkIcon className="h-4 w-4 mr-1 text-muted-foreground" />
            {group.urls.length} link(s)
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2">
        <ul className="space-y-1 text-sm text-muted-foreground max-h-32 overflow-y-auto">
          {group.urls.slice(0, 3).map((url, index) => (
            <li key={index} className="truncate" title={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary transition-colors">
                {url}
              </a>
            </li>
          ))}
          {group.urls.length > 3 && <li className="italic">...and {group.urls.length - 3} more</li>}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-row flex-nowrap items-center justify-between gap-x-2 pt-4 border-t">
        <div className="flex flex-row items-center gap-x-2 flex-shrink min-w-0">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleOpenLinks}
                        onPointerDown={stopPropagation}
                        className="justify-center group overflow-hidden"
                        variant="default"
                    >
                        <ExternalLink className="h-4 w-4 group-hover:animate-pulse shrink-0" />
                        <span className="hidden md:inline ml-2 truncate">Open All</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Open all links (current window)</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleOpenInNewWindowClick}
                        onPointerDown={stopPropagation}
                        className="justify-center group overflow-hidden"
                        variant="outline"
                    >
                        <AppWindow className="h-4 w-4 shrink-0" />
                        <span className="hidden md:inline ml-2 truncate">New Window</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Open all links in a new window (via copied link)</p>
                </TooltipContent>
            </Tooltip>
        </div>
        <div className="flex flex-row items-center gap-x-2 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => onEdit(group)} onPointerDown={stopPropagation} aria-label="Edit group">
                <Edit3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit group</p>
            </TooltipContent>
          </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" onPointerDown={stopPropagation} aria-label="Delete group">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete group</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the link group "{group.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(group)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}

