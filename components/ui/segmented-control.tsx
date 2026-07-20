"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-input">
      {options.map((option, i) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-10 items-center gap-2 px-[18px] text-sm font-medium transition-colors",
              i > 0 && "border-l border-input",
              selected ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
            )}
          >
            {selected && <Check className="size-3.5" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
