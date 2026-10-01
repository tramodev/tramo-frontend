"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const GROUPS: { title: string; shortcuts: [string, string][] }[] = [
  {
    title: "Moverse",
    shortcuts: [
      ["⌘P", "Buscar un item en el memex"],
      ["↑ / ↓ al inicio o final", "Pasar al item anterior / siguiente"],
      ["⌘⌥↑ / ⌘⌥↓", "Item anterior / siguiente del trail"],
      ["Esc", "Ir a la barra de herramientas y volver"],
      ["⌘F", "Buscar y reemplazar en el item"],
    ],
  },
  {
    title: "Insertar",
    shortcuts: [
      ["/", "Menú de inserción"],
      ["@", "Mencionar otro item"],
      ["[[", "Enlazar otro item"],
      ["⌘E", "Ecuación en línea"],
      ["⌘⇧E", "Ecuación en bloque"],
      ["⌘K", "Enlace"],
      ["⌘↵", "Nuevo paso del trail"],
    ],
  },
  {
    title: "Escribir",
    shortcuts: [
      ["⌘B / ⌘I / ⌘U", "Negrita / itálica / subrayado"],
      ["Tab / ⇧Tab", "Indentar / desindentar en listas"],
      ["⌘Z / ⌘⇧Z", "Deshacer / rehacer"],
      ["# ## ###", "Títulos (con espacio al final)"],
      ["- / 1. / >", "Lista, lista numerada, cita"],
    ],
  },
]

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      if (!open) previousFocusRef.current = document.activeElement as HTMLElement | null
      setOpen(!open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          const previous = previousFocusRef.current
          if (previous === null || !previous.isConnected) return
          event.preventDefault()
          previous.focus({ preventScroll: true })
        }}
      >
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>⌘/ abre y cierra esta ventana.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
              {group.shortcuts.map(([keys, label]) => (
                <div key={keys} className="flex items-baseline justify-between gap-4">
                  <span className="text-sm">{label}</span>
                  <kbd className="shrink-0 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
