
"use client";

import type { LinkGroup } from "@/lib/types";
import { SortableLinkGroupItem } from "./sortable-link-group-item";
import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutGrid } from "lucide-react";
import { LinkGroupCard } from "./link-group-card"; 
import { EmptyStateMessage } from "@/components/ui/empty-state-message";

interface LinkGroupListProps {
  groups: LinkGroup[];
  onOpenGroup: (group: LinkGroup) => void;
  onEditGroup: (group: LinkGroup) => void;
  onDeleteGroup: (group: LinkGroup) => void;
  onAddGroup: () => void;
  onOpenInNewWindow: (group: LinkGroup) => void;
  isReadOnlyPreview?: boolean;
}

export function LinkGroupList({
  groups,
  onOpenGroup,
  onEditGroup,
  onDeleteGroup,
  onAddGroup,
  onOpenInNewWindow,
  isReadOnlyPreview = false,
}: LinkGroupListProps) {
  if (groups.length === 0) {
    return (
      <EmptyStateMessage
        icon={<LayoutGrid className="h-16 w-16" />}
        title={isReadOnlyPreview ? "No Link Groups Here" : "No Link Groups Yet"}
        description={
          isReadOnlyPreview
            ? "This shared page currently has no link groups. Save it to your home page to add some!"
            : "Get started by creating your first link group."
        }
        actions={
          !isReadOnlyPreview ? (
            <Button onClick={onAddGroup} size="lg" data-joyride="add-new-group-button">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Group
            </Button>
          ) : undefined
        }
      />
    );
  }


  return (
    <div className="space-y-6">
      {!isReadOnlyPreview && (
        <div className="flex justify-end">
          <Button onClick={onAddGroup} disabled={isReadOnlyPreview} data-joyride="add-new-group-button">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Group
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group, index) => { // Added index for joyride targeting
          const joyrideProps = {
            card: index === 0 ? { "data-joyride": "link-group-card" } : {},
            editButton: index === 0 ? { "data-joyride": "link-group-edit-button" } : {},
            deleteButton: index === 0 ? { "data-joyride": "link-group-delete-button" } : {},
          };

          return isReadOnlyPreview ? (
            <LinkGroupCard
              key={group.id}
              group={group}
              onOpen={onOpenGroup}
              onEdit={onEditGroup} 
              onDelete={onDeleteGroup} 
              onOpenInNewWindow={onOpenInNewWindow}
              isReadOnlyPreview={isReadOnlyPreview}
              // Joyride props are not typically needed for read-only cards
            />
          ) : (
            <SortableLinkGroupItem
              key={group.id}
              group={group}
              onOpen={onOpenGroup}
              onEdit={onEditGroup}
              onDelete={onDeleteGroup}
              onOpenInNewWindow={onOpenInNewWindow}
              isReadOnlyPreview={isReadOnlyPreview}
              joyrideContainerProps={joyrideProps.card}
              joyrideEditButtonProps={joyrideProps.editButton}
              joyrideDeleteButtonProps={joyrideProps.deleteButton}
            />
          );
        })}
      </div>
    </div>
  );
}

    
