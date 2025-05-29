
"use client";

import type { LinkGroup } from "@/lib/types";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkGroupCard } from "./link-group-card";
import { cn } from "@/lib/utils";

interface SortableLinkGroupItemProps {
  group: LinkGroup;
  onOpen: (group: LinkGroup) => void;
  onEdit: (group: LinkGroup) => void;
  onDelete: (group: LinkGroup) => void;
  onOpenInNewWindow: (group: LinkGroup) => void;
  isReadOnlyPreview?: boolean;
  joyrideContainerProps?: Record<string, unknown>;
  joyrideEditButtonProps?: Record<string, unknown>;
  joyrideDeleteButtonProps?: Record<string, unknown>;
}

export function SortableLinkGroupItem({ 
  group, 
  onOpen, 
  onEdit, 
  onDelete, 
  onOpenInNewWindow,
  isReadOnlyPreview = false,
  joyrideContainerProps = {},
  joyrideEditButtonProps = {},
  joyrideDeleteButtonProps = {},
}: SortableLinkGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: group.id,
    disabled: isReadOnlyPreview, 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isReadOnlyPreview ? {} : attributes)} 
      {...(isReadOnlyPreview ? {} : listeners)}  
      className={cn(
        "touch-manipulation",
        isDragging && !isReadOnlyPreview ? "cursor-grabbing z-50" : (!isReadOnlyPreview ? "cursor-grab z-0" : ""),
      )}
      {...joyrideContainerProps}
    >
      <LinkGroupCard
        group={group}
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenInNewWindow={onOpenInNewWindow}
        isDragging={isDragging && !isReadOnlyPreview}
        isReadOnlyPreview={isReadOnlyPreview}
        joyrideEditButtonProps={joyrideEditButtonProps}
        joyrideDeleteButtonProps={joyrideDeleteButtonProps}
      />
    </div>
  );
}

    