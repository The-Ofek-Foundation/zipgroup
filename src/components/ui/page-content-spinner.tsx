
"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageContentSpinnerProps {
  className?: string;
  text?: string;
}

export function PageContentSpinner({ className, text }: PageContentSpinnerProps) {
  return (
    <div
      className={cn(
        "min-h-[300px] flex flex-col items-center justify-center bg-background text-primary",
        className
      )}
    >
      <Loader2 className="h-12 w-12 animate-spin" />
      {text && <p className="mt-4 text-lg text-muted-foreground">{text}</p>}
    </div>
  );
}
