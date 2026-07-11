"use client"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="rounded-none shadow-none"
        style={{
          background: "var(--color-bg)",
          color: "var(--color-text)",
          border: "2px solid var(--color-divider)",
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: "var(--color-text)" }}>{title}</AlertDialogTitle>
          <AlertDialogDescription style={{ color: "var(--color-neutral-700)" }}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(destructive && buttonVariants({ variant: "destructive" }), "rounded-none")}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
