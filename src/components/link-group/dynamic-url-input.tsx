
"use client";

import type React from "react";
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

interface DynamicUrlInputProps {
  urls: string[];
  onChange: (urls: string[]) => void;
}

interface SortableUrlItemProps {
  id: string;
  url: string;
  index: number;
  urlsCount: number;
  handleUrlChange: (index: number, value: string) => void;
  removeUrlField: (index: number) => void;
}

function SortableUrlItem({ id, url, index, urlsCount, handleUrlChange, removeUrlField }: SortableUrlItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
        value={url}
        onChange={(e) => handleUrlChange(index, e.target.value)}
        className="flex-grow"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeUrlField(index)}
            aria-label="Remove URL"
            disabled={urlsCount <= 1 && index === 0}
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

export function DynamicUrlInput({ urls, onChange }: DynamicUrlInputProps) {
  // Ensure each URL has a unique, stable ID for dnd-kit
  // We'll use their index in the original array as part of the ID if URLs can be duplicated.
  // For simplicity, if URLs are generally unique, they can be their own IDs.
  // If not, we'll need a more robust ID generation strategy (e.g., mapping to objects with IDs).
  // For now, let's assume indices can work if we map URLs to IDs:
  const items = urls.map((_, index) => `url-${index}`);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(urls, oldIndex, newIndex));
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {urls.map((url, index) => (
            <SortableUrlItem
              key={items[index]} // Use the generated stable ID
              id={items[index]}   // Use the generated stable ID
              url={url}
              index={index}
              urlsCount={urls.length}
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
