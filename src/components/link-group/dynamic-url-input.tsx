"use client";

import type React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, XCircle } from "lucide-react";

interface DynamicUrlInputProps {
  urls: string[];
  onChange: (urls: string[]) => void;
}

export function DynamicUrlInput({ urls, onChange }: DynamicUrlInputProps) {
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    onChange(newUrls);
  };

  const addUrlField = () => {
    onChange([...urls, ""]);
  };

  const removeUrlField = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className="space-y-2">
      {urls.map((url, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => handleUrlChange(index, e.target.value)}
            className="flex-grow"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeUrlField(index)}
            aria-label="Remove URL"
            disabled={urls.length <= 1 && index === 0} 
          >
            <XCircle className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addUrlField}
        className="mt-2"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Add URL
      </Button>
    </div>
  );
}
