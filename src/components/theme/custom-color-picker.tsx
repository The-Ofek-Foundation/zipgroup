
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Palette, RotateCcw } from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";

export function CustomColorPicker() {
  const { appData, setCustomPrimaryColor } = useAppData();
  const [selectedColor, setSelectedColor] = useState<string>(appData?.customPrimaryColor || "#72BCD4"); // Default to current or a fallback
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    // Update local color if appData changes (e.g. loaded from storage or reset)
    setSelectedColor(appData?.customPrimaryColor || "#72BCD4");
  }, [appData?.customPrimaryColor]);

  const handleApply = () => {
    setCustomPrimaryColor(selectedColor);
    setIsPopoverOpen(false);
  };

  const handleReset = () => {
    setCustomPrimaryColor(undefined); // Clears the custom color
    setSelectedColor("#72BCD4"); // Reset local picker to a default
    setIsPopoverOpen(false);
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
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
              id="custom-primary-color"
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="h-8 w-14 p-0.5 border-input" // Adjusted for color input
            />
            <Input
              type="text"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="h-8 flex-1 text-xs"
              placeholder="#RRGGBB"
            />
          </div>
           <p className="text-xs text-muted-foreground">
            Sets the main color for UI elements and accents.
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
