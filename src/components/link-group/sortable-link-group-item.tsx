
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
}

export function SortableLinkGroupItem({ group, onOpen, onEdit, onDelete, onOpenInNewWindow }: SortableLinkGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease', // Ensure transition is applied
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-manipulation", // For better mobile drag experience
        isDragging ? "z-50" : "z-0" // Ensure dragged item is on top
      )}
    >
      <LinkGroupCard
        group={group}
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenInNewWindow={onOpenInNewWindow}
        isDragging={isDragging}
      />
    </div>
  );
}
