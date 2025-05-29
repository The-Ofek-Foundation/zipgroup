
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, XCircle, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UrlItem {
  id: string;
  value: string;
}

interface DynamicUrlInputProps {
  urls: string[]; // Comes from React Hook Form's field.value
  onChange: (urls: string[]) => void; // Comes from React Hook Form's field.onChange
}

interface SortableUrlItemProps {
  item: UrlItem;
  urlsCount: number;
  handleUrlChange: (id: string, value: string) => void;
  removeUrlField: (id: string) => void;
}

function SortableUrlItem({ item, urlsCount, handleUrlChange, removeUrlField }: SortableUrlItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-2 py-1", isDragging && "shadow-lg bg-background rounded-md")}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2"
            aria-label="Drag to reorder URL"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Drag to reorder</p>
        </TooltipContent>
      </Tooltip>
      <Input
        type="url"
        placeholder="https://example.com"
        value={item.value}
        onChange={(e) => handleUrlChange(item.id, e.target.value)}
        className="flex-grow"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeUrlField(item.id)}
            aria-label="Remove URL"
            disabled={urlsCount <= 1} // Simplified: disable if it's the only item
          >
            <XCircle className="h-5 w-5 text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Remove URL</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function DynamicUrlInput({ urls: propUrls, onChange }: DynamicUrlInputProps) {
  // Initialize internal state from propUrls, ensuring propUrls is an array.
  const [items, setItems] = useState<UrlItem[]>(() =>
    (propUrls || []).map(urlValue => ({ id: crypto.randomUUID(), value: urlValue }))
  );

  // Effect to sync with propUrls if it changes from parent (e.g., form reset, initial data load)
  useEffect(() => {
    // Convert current items to a string array for comparison
    const currentItemValues = items.map(item => item.value);
    const safePropUrls = propUrls || [];

    // Only update internal 'items' if 'propUrls' truly represents a different set of values.
    // This comparison helps prevent infinite loops if 'propUrls' reference changes but content is effectively the same.
    if (JSON.stringify(safePropUrls) !== JSON.stringify(currentItemValues)) {
      setItems(safePropUrls.map(urlValue => ({ id: crypto.randomUUID(), value: urlValue })));
    }
  }, [propUrls]); // Only depend on propUrls for this effect.

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleUrlChange = (id: string, value: string) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, value } : item
    );
    setItems(newItems);
    onChange(newItems.map(item => item.value));
  };

  const addUrlField = () => {
    const newItem = { id: crypto.randomUUID(), value: "" };
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange(newItems.map(item => item.value));
  };

  const removeUrlField = (id: string) => {
    // Filter out the item to be removed
    const newItems = items.filter(item => item.id !== id);

    if (newItems.length === 0) {
      // If removing this field would leave no fields,
      // instead, reset it to an empty string if it's the last one,
      // or add a new empty field if the list was truly emptied by the filter.
      // This ensures there's always at least one input field.
      const fallbackItem = { id: crypto.randomUUID(), value: "" };
      setItems([fallbackItem]);
      onChange([fallbackItem.value]);
    } else {
      setItems(newItems);
      onChange(newItems.map(item => item.value));
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems(currentItems => {
        const oldIndex = currentItems.findIndex(item => item.id === active.id);
        const newIndex = currentItems.findIndex(item => item.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);
          onChange(reorderedItems.map(item => item.value)); // Report change to parent form
          return reorderedItems; // Update local state
        }
        return currentItems; // Should not happen if IDs are correct
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((item) => (
            <SortableUrlItem
              key={item.id}
              item={item}
              urlsCount={items.length}
              handleUrlChange={handleUrlChange}
              removeUrlField={removeUrlField}
            />
          ))}
        </div>
      </SortableContext>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addUrlField}
        className="mt-3"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Add URL
      </Button>
    </DndContext>
  );
}
