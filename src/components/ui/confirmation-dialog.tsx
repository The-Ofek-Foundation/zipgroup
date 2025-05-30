
"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  confirmVariant?: "default" | "destructive";
  cancelText?: string;
  isConfirming?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  confirmVariant = "destructive",
  cancelText = "Cancel",
  isConfirming = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    if (isConfirming) return;
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Added role="dialog" and aria-labelledby/describedby for better accessibility in tests */}
      <DialogContent aria-labelledby="confirmation-dialog-title" aria-describedby="confirmation-dialog-description">
        <DialogHeader>
          <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
          <DialogDescription id="confirmation-dialog-description">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

