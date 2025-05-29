
"use client";

import type { LinkGroup } from "@/lib/types";
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicUrlInput } from "./dynamic-url-input";
import LucideIcon from "@/components/icons/lucide-icon";
import { Loader2, Wand2 } from "lucide-react";
import { suggestIcon } from "@/ai/flows/suggest-icon"; // AI function
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


const linkGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  icon: z.string().min(1, "Icon name is required"),
  urls: z.array(z.string().url("Invalid URL format")).min(1, "At least one URL is required"),
});

type LinkGroupFormData = z.infer<typeof linkGroupSchema>;

interface LinkGroupFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LinkGroup) => void;
  initialData?: LinkGroup | null;
}

export function LinkGroupFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: LinkGroupFormDialogProps) {
  const { toast } = useToast();
  const [isSuggestingIcon, setIsSuggestingIcon] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LinkGroupFormData>({
    resolver: zodResolver(linkGroupSchema),
    defaultValues: {
      name: "",
      icon: "Package", // Default icon
      urls: [""],
    },
  });

  const groupName = watch("name");
  const iconName = watch("icon");

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        icon: initialData.icon,
        urls: initialData.urls.length > 0 ? initialData.urls : [""],
      });
    } else {
      reset({
        name: "",
        icon: "Package",
        urls: [""],
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = (data: LinkGroupFormData) => {
    onSubmit({
      id: initialData?.id || crypto.randomUUID(),
      ...data,
    });
    onClose();
  };

  const handleSuggestIcon = async () => {
    if (!groupName) {
      toast({
        title: "Icon Suggestion",
        description: "Please enter a group name first.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingIcon(true);
    try {
      const result = await suggestIcon({ groupName });
      if (result.iconName) {
        setValue("icon", result.iconName, { shouldValidate: true });
        toast({
          title: "Icon Suggestion",
          description: `Suggested icon: ${result.iconName}`,
        });
      } else {
        toast({
          title: "Icon Suggestion Failed",
          description: "Could not suggest an icon.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error suggesting icon:", error);
      toast({
        title: "Icon Suggestion Error",
        description: "An error occurred while suggesting an icon.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingIcon(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Create"} Link Group</DialogTitle>
          <DialogDescription>
            {initialData ? "Modify your" : "Add a new"} link group to quickly open sets of URLs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="icon">Icon Name (Lucide)</Label>
            <div className="flex items-center gap-2">
              <Input id="icon" {...register("icon")} placeholder="e.g., Briefcase, Home, Settings" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="icon" onClick={handleSuggestIcon} disabled={isSuggestingIcon || !groupName} aria-label="Suggest Icon">
                    {isSuggestingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Suggest icon using AI</p>
                </TooltipContent>
              </Tooltip>
              <div className="p-2 border rounded-md bg-muted">
                <LucideIcon name={iconName || "HelpCircle"} size={24} />
              </div>
            </div>
            {errors.icon && <p className="text-sm text-destructive mt-1">{errors.icon.message}</p>}
             <p className="text-xs text-muted-foreground mt-1">Enter a <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="underline">Lucide icon</a> name.</p>
          </div>

          <div>
            <Label>URLs</Label>
            <Controller
              name="urls"
              control={control}
              render={({ field }) => <DynamicUrlInput urls={field.value} onChange={field.onChange} />}
            />
            {errors.urls && <p className="text-sm text-destructive mt-1">{errors.urls.message || (errors.urls as any).root?.message}</p>}
             {errors.urls?.map((error, index) => error && <p key={index} className="text-sm text-destructive mt-1">{`URL ${index + 1}: ${error.message}`}</p>)}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Group</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
