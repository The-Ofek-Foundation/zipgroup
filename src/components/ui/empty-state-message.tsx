
"use client";

import type React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateMessageProps {
  icon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function EmptyStateMessage({
  icon,
  title,
  description,
  actions,
  className,
}: EmptyStateMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {icon && <div className="mb-6 text-primary">{icon}</div>}
      <h2 className="text-2xl font-semibold text-foreground mb-3">
        {title}
      </h2>
      <div className="text-md text-muted-foreground mb-8 max-w-md mx-auto">
        {typeof description === 'string' ? <p>{description}</p> : description}
      </div>
      {actions && <div className="flex flex-col sm:flex-row items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
