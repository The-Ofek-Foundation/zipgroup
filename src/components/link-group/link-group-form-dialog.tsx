
"use client";

import type { LinkGroup } from "@/lib/types";
import React, { useEffect } from "react"; // Removed useState as it's not directly used for local state here
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
import { IconPickerInput } from "./icon-picker-input"; 
import { useToast } from "@/hooks/use-toast";


const linkGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  icon: z.string().min(1, "Icon name is required. Please pick one."),
  urls: z.array(z.string().min(1, "URL field cannot be empty. Please enter a web address.")).min(1, "At least one URL is required"),
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

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }, 
  } = useForm<LinkGroupFormData>({
    resolver: zodResolver(linkGroupSchema),
    defaultValues: { 
      name: "",
      icon: "Package", 
      urls: [""], 
    },
  });


  useEffect(() => {
    if (isOpen) {
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
    }
  // More granular dependencies: re-run if isOpen changes, or if the ID of the initialData changes,
  // or if other key fields of initialData change. This makes it more stable against
  // simple reference changes of the initialData object if its content is the same.
  }, [isOpen, initialData?.id, initialData?.name, initialData?.icon, JSON.stringify(initialData?.urls), reset]);

  const handleFormSubmit = (data: LinkGroupFormData) => {
    onSubmit({
      id: initialData?.id || crypto.randomUUID(),
      ...data,
    });
    onClose(); 
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Create"} Link Group</DialogTitle>
          <DialogDescription>
            {initialData ? "Modify your" : "Add a new"} link group to quickly open sets of URLs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div data-joyride="group-form-name-input">
            <Label htmlFor="name">Group Name</Label>
            <Input id="name" {...register("name")} className="mt-1" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div data-joyride="group-form-icon-picker">
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

          <div data-joyride="group-form-urls-input">
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" data-joyride="group-form-save-button" disabled={isSubmitting}>Save Group</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
