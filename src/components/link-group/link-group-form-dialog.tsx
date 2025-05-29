
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
import { IconPickerInput } from "./icon-picker-input"; // New component
// Removed: Loader2, Wand2, suggestIcon, useToast (if only for suggestIcon)
// useToast might still be used by the parent component or for other form actions, so keep it for now.
import { useToast } from "@/hooks/use-toast";
// Tooltip components are used by IconPickerInput internally or can be removed if not used elsewhere in this file
// For now, keeping TooltipProvider at a higher level (page.tsx) is fine.

const linkGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  icon: z.string().min(1, "Icon name is required. Please pick one."),
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
  const { toast } = useToast(); // Kept in case of future use or if parent needs it

  const {
    control,
    register,
    handleSubmit,
    reset,
    // watch, // watch("icon") and watch("name") no longer needed for this component directly
    // setValue, // setValue("icon") is now handled by Controller
    formState: { errors },
  } = useForm<LinkGroupFormData>({
    resolver: zodResolver(linkGroupSchema),
    defaultValues: {
      name: "",
      icon: "Package", // Default icon
      urls: [""],
    },
  });

  // const groupName = watch("name"); // No longer needed for AI suggestion trigger
  // const iconName = watch("icon"); // The IconPickerInput will display its own preview

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
        icon: "Package", // Reset to default
        urls: [""],
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = (data: LinkGroupFormData) => {
    onSubmit({
      id: initialData?.id || crypto.randomUUID(),
      ...data,
    });
    onClose(); // This will also trigger reset due to useEffect dependency on isOpen
  };

  // Removed handleSuggestIcon and isSuggestingIcon state

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Create"} Link Group</DialogTitle>
          <DialogDescription>
            {initialData ? "Modify your" : "Add a new"} link group to quickly open sets of URLs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input id="name" {...register("name")} className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="icon-picker">Icon</Label>
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <IconPickerInput
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.icon && <p className="text-sm text-destructive mt-1">{errors.icon.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Search and select a <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="underline">Lucide icon</a>.
            </p>
          </div>

          <div>
            <Label>URLs</Label>
            <Controller
              name="urls"
              control={control}
              render={({ field }) => <DynamicUrlInput urls={field.value} onChange={field.onChange} />}
            />
            {errors.urls && (
              <p className="text-sm text-destructive mt-1">
                {typeof errors.urls.message === 'string' ? errors.urls.message : (errors.urls as any)?.root?.message}
              </p>
            )}
            {Array.isArray(errors.urls) && errors.urls.map((error, index) => 
              error && <p key={index} className="text-sm text-destructive mt-1">{`URL ${index + 1}: ${error.message}`}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
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
