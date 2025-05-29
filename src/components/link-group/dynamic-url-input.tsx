
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
  urls: string[];
  onChange: (urls: string[]) => void;
}

interface SortableUrlItemProps {
  item: UrlItem; // Changed from 'url' and 'index' to 'item'
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
            disabled={urlsCount <= 1 && item.value === internalUrlItems[0]?.value} // Check if it's the only item
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


// Helper: Keep track of internal items to ensure stable IDs for dnd-kit
let internalUrlItems: UrlItem[] = [];

export function DynamicUrlInput({ urls: propUrls, onChange }: DynamicUrlInputProps) {
  const [items, setItems] = useState<UrlItem[]>(() =>
    propUrls.map(urlValue => ({ id: crypto.randomUUID(), value: urlValue }))
  );

  // Effect to sync with propUrls if it changes from parent (e.g., form reset)
  useEffect(() => {
    // This simple check might not be perfect for all parent update scenarios,
    // but handles cases where the array reference or length changes.
    // It re-generates IDs, which is acceptable if the whole list context changes.
    if (propUrls.length !== items.length || propUrls.some((url, i) => url !== items[i]?.value)) {
      setItems(propUrls.map(urlValue => ({ id: crypto.randomUUID(), value: urlValue })));
    }
  }, [propUrls]);


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
    const newItems = items.filter(item => item.id !== id);
    // Ensure at least one URL field remains if it's currently empty
    if (newItems.length === 0 && items.length === 1 && items[0].value === "") {
        // Do not remove the last empty field
        return;
    }
    if (newItems.length === 0) { // if all fields removed, add one back
        const newFallbackItem = {id: crypto.randomUUID(), value: ""};
        setItems([newFallbackItem]);
        onChange([newFallbackItem.value]);
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
          onChange(reorderedItems.map(item => item.value));
          return reorderedItems;
        }
        return currentItems; // Should not happen if IDs are correct
      });
    }
  }
  
  // Update internalUrlItems for SortableUrlItem's disabled logic
  internalUrlItems = items;


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
