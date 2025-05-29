
"use client";

import type { LinkGroup } from "@/lib/types";
// LinkGroupCard is now rendered by SortableLinkGroupItem
import { SortableLinkGroupItem } from "./sortable-link-group-item";
import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutGrid } from "lucide-react";

interface LinkGroupListProps {
  groups: LinkGroup[];
  onOpenGroup: (group: LinkGroup) => void;
  onEditGroup: (group: LinkGroup) => void;
  onDeleteGroup: (group: LinkGroup) => void;
  onAddGroup: () => void;
  onOpenInNewWindow: (group: LinkGroup) => void;
}

export function LinkGroupList({
  groups,
  onOpenGroup,
  onEditGroup,
  onDeleteGroup,
  onAddGroup,
  onOpenInNewWindow,
}: LinkGroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <LayoutGrid className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Link Groups Yet</h2>
        <p className="text-muted-foreground mb-6">
          Get started by creating your first link group.
        </p>
        <Button onClick={onAddGroup} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Group
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={onAddGroup}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Group
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <SortableLinkGroupItem
            key={group.id}
            group={group}
            onOpen={onOpenGroup}
            onEdit={onEditGroup}
            onDelete={onDeleteGroup}
            onOpenInNewWindow={onOpenInNewWindow}
          />
        ))}
      </div>
    </div>
  );
}
