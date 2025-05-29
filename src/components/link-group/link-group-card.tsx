"use client";

import type { LinkGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import LucideIcon from "@/components/icons/lucide-icon";
import { ExternalLink, Edit3, Trash2, Link as LinkIcon } from "lucide-react";
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

interface LinkGroupCardProps {
  group: LinkGroup;
  onOpen: (group: LinkGroup) => void;
  onEdit: (group: LinkGroup) => void;
  onDelete: (group: LinkGroup) => void;
}

export function LinkGroupCard({ group, onOpen, onEdit, onDelete }: LinkGroupCardProps) {
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
        // Check if URL is valid before trying to open
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

  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
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
      <CardFooter className="flex justify-between pt-4 border-t">
        <Button onClick={handleOpenLinks} className="w-full mr-2 group" variant="default">
          <ExternalLink className="mr-2 h-4 w-4 group-hover:animate-pulse" /> Open All
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onEdit(group)} aria-label="Edit group">
            <Edit3 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" aria-label="Delete group">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
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
