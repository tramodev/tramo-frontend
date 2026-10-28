// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  cancelLabel?: string
  destructive?: boolean
  requireText?: string
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  requireText,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("")

  const confirmDisabled = requireText !== undefined && typed !== requireText

  function handleOpenChange(next: boolean) {
    if (!next) setTyped("")
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle className="[overflow-wrap:anywhere]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="[overflow-wrap:anywhere]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {requireText !== undefined && (
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">{requireText}</span> to confirm
            </label>
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn(destructive && buttonVariants({ variant: "destructive" }))}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
