
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Palette, RotateCcw } from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { hexToHslValues } from "@/lib/color-utils";

// Helper to apply/remove styles directly to the document for live preview or reverting
const applyStylesToDocument = (hexColor: string | null | undefined) => {
  const root = document.documentElement;
  if (hexColor) {
    const hslValues = hexToHslValues(hexColor);
    if (hslValues) {
      const hslString = `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`;
      root.style.setProperty('--primary', hslString);
      root.style.setProperty('--accent', hslString); // Sync accent with primary
      const ringL = Math.max(0, hslValues.l - 6);
      root.style.setProperty('--ring', `${hslValues.h} ${hslValues.s}% ${ringL}%`);
      return;
    }
  }
  // If no hexColor or invalid, remove custom properties to revert to CSS-defined defaults
  root.style.removeProperty('--primary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--ring');
};

export function CustomColorPicker() {
  const { appData, setCustomPrimaryColor } = useAppData();
  // Local state for the color input. Initialized with a default, then synced.
  const [pickerColor, setPickerColor] = useState<string>("#72BCD4"); 
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Effect to synchronize pickerColor with appData.customPrimaryColor when it changes externally
  // or on initial load, but only if the popover is NOT open (to avoid overriding live input).
  useEffect(() => {
    if (!isPopoverOpen) {
      setPickerColor(appData?.customPrimaryColor || "#72BCD4");
    }
  }, [appData?.customPrimaryColor, isPopoverOpen]);

  // Effect for live preview: When pickerColor changes AND popover is open, apply styles.
  useEffect(() => {
    if (isPopoverOpen) {
      applyStylesToDocument(pickerColor);
    }
    // No cleanup needed here as onPopoverOpenChange handles reverting if not applied.
  }, [pickerColor, isPopoverOpen]);

  const handleApply = () => {
    setCustomPrimaryColor(pickerColor); // This updates appData; ThemeProvider will react.
    setIsPopoverOpen(false);
    // No need to call applyStylesToDocument here, ThemeProvider takes over based on new appData.
  };

  const handleReset = () => {
    setCustomPrimaryColor(undefined); // Updates appData; ThemeProvider will react.
    setPickerColor("#72BCD4"); // Reset picker's visual to default
    setIsPopoverOpen(false);
    // ThemeProvider will apply defaults after appData update.
    // To ensure immediate visual revert if ThemeProvider lags (it shouldn't), call:
    applyStylesToDocument(null); 
  };

  const onPopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      // When popover opens, ensure pickerColor is set to the current appData color
      setPickerColor(appData?.customPrimaryColor || "#72BCD4");
      // Apply this initial color for preview consistency if it's different from current pickerColor state
      applyStylesToDocument(appData?.customPrimaryColor || "#72BCD4");
    } else {
      // When popover closes, revert any unapplied live preview to match appData.
      // ThemeProvider will ultimately ensure this, but explicit revert is safer.
      applyStylesToDocument(appData?.customPrimaryColor);
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={onPopoverOpenChange}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Customize theme color">
                <Palette className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Customize theme color</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-auto p-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="custom-primary-color" className="text-sm font-medium">
            Primary Color
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="custom-primary-color-picker" // Unique ID for color type input
              type="color"
              value={pickerColor}
              onChange={(e) => setPickerColor(e.target.value)}
              className="h-8 w-14 p-0.5 border-input"
            />
            <Input
              id="custom-primary-color-text" // Unique ID for text type input
              type="text"
              value={pickerColor}
              onChange={(e) => setPickerColor(e.target.value)}
              className="h-8 flex-1 text-xs"
              placeholder="#RRGGBB"
            />
          </div>
           <p className="text-xs text-muted-foreground">
            Live preview. Click Apply to save.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
