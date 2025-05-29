
"use client";

import type React from "react";
import { useState, useMemo, useEffect } from "react";
import { icons } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import LucideIcon from "@/components/icons/lucide-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";

interface IconPickerInputProps {
  value: string;
  onChange: (value: string) => void;
  // Prop to receive the field ID for aria-labelledby if needed, or manage label internally
}

// Get all icon names from lucide-react (they are already in PascalCase)
const allIconNames = Object.keys(icons);
const popularIcons = ["Package", "Briefcase", "Home", "Settings", "FileText", "Users", "Link", "Folder", "Search", "Star", "Zap", "Globe"];


export function IconPickerInput({ value, onChange }: IconPickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIcons = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      // Show popular icons first, then the rest, avoiding duplicates
      const remainingIcons = allIconNames.filter(name => !popularIcons.includes(name));
      return [...popularIcons, ...remainingIcons.slice(0, 50 - popularIcons.length)]; // Limit initial display
    }
    return allIconNames.filter(name =>
      name.toLowerCase().includes(term)
    ).slice(0, 100); // Limit search results to avoid overwhelming render
  }, [searchTerm]);

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearchTerm(""); // Reset search term after selection
  };
  
  // Ensure PopoverContent re-renders if value changes externally (e.g. form reset)
  // This is more for complex scenarios, here it's mainly for consistency.
  useEffect(() => {
    if (isOpen) {
      // If value changes while picker is open, could update something or just rely on display
    }
  }, [value, isOpen]);


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left h-10">
          <LucideIcon name={value || "HelpCircle"} className="mr-2 h-5 w-5 shrink-0" />
          <span className="truncate">
            {value || "Select an icon"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" side="bottom" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="h-9"
          />
        </div>
        <ScrollArea className="h-[250px]">
          {filteredIcons.length > 0 ? (
            <div className="p-2 grid grid-cols-6 gap-1">
              {filteredIcons.map(iconName => (
                <TooltipProvider key={iconName} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`p-1.5 h-auto w-auto rounded-md relative ${
                          value === iconName ? 'bg-primary/10 text-primary' : ''
                        }`}
                        onClick={() => handleIconSelect(iconName)}
                        title={iconName} // Native tooltip for quick hover info
                      >
                        <LucideIcon name={iconName} size={22} />
                        {value === iconName && (
                           <Check className="absolute bottom-0.5 right-0.5 h-3 w-3 text-primary bg-background rounded-full p-0.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p>{iconName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ) : (
             <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                No icons found for "{searchTerm}".
              </p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
