
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Palette, RotateCcw } from "lucide-react";
import { hexToHslValues } from "@/lib/color-utils";

interface CustomColorPickerProps {
  currentCustomColor: string | undefined;
  onSetCustomColor: (color?: string) => void;
  disabled?: boolean;
  joyrideProps?: Record<string, unknown>; // For react-joyride targeting
}

const applyStylesToDocument = (hexColor: string | null | undefined) => {
  const root = document.documentElement;
  if (hexColor) {
    const hslValues = hexToHslValues(hexColor);
    if (hslValues) {
      const hslString = `${hslValues.h} ${hslValues.s}% ${hslValues.l}%`;
      root.style.setProperty('--primary', hslString);
      root.style.setProperty('--accent', hslString);
      const ringL = Math.max(0, hslValues.l - 6);
      root.style.setProperty('--ring', `${hslValues.h} ${hslValues.s}% ${ringL}%`);
      return;
    }
  }
  root.style.removeProperty('--primary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--ring');
};

export function CustomColorPicker({ currentCustomColor, onSetCustomColor, disabled = false, joyrideProps }: CustomColorPickerProps) {
  const [pickerColor, setPickerColor] = useState<string>(currentCustomColor || "#72BCD4");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (!isPopoverOpen) {
      setPickerColor(currentCustomColor || "#72BCD4");
    }
  }, [currentCustomColor, isPopoverOpen]);

  useEffect(() => {
    if (isPopoverOpen && !disabled) {
      applyStylesToDocument(pickerColor);
    }
  }, [pickerColor, isPopoverOpen, disabled]);

  const handleApply = () => {
    if (disabled) return;
    onSetCustomColor(pickerColor);
    setIsPopoverOpen(false);
  };

  const handleReset = () => {
    if (disabled) return;
    onSetCustomColor(undefined); 
    setPickerColor("#72BCD4"); 
    setIsPopoverOpen(false);
    applyStylesToDocument(null);
  };

  const onPopoverOpenChange = (open: boolean) => {
    if (disabled && open) return; // Prevent opening if disabled
    setIsPopoverOpen(open);
    if (open) {
      const initialColor = currentCustomColor || "#72BCD4";
      setPickerColor(initialColor);
      applyStylesToDocument(initialColor); 
    } else {
      applyStylesToDocument(currentCustomColor);
    }
  };

  return (
    <Popover open={isPopoverOpen && !disabled} onOpenChange={onPopoverOpenChange}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Customize theme color" 
                disabled={disabled}
                {...joyrideProps} // Spread joyrideProps here
              >
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
          <Label htmlFor="custom-primary-color-picker" className="text-sm font-medium">
            Primary Color
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="custom-primary-color-picker"
              type="color"
              value={pickerColor}
              onChange={(e) => setPickerColor(e.target.value)}
              className="h-8 w-14 p-0.5 border-input"
              disabled={disabled}
            />
            <Input
              id="custom-primary-color-text"
              type="text"
              value={pickerColor}
              onChange={(e) => setPickerColor(e.target.value)}
              className="h-8 flex-1 text-xs"
              placeholder="#RRGGBB"
              disabled={disabled}
            />
          </div>
           <p className="text-xs text-muted-foreground">
            Live preview. Click Apply to save.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5" disabled={disabled}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleApply} disabled={disabled}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
