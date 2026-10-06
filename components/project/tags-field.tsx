// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { autocompleteTags, type TagSuggestion } from "@/lib/tags"
import { cn } from "@/lib/utils"

export function TagsField({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fragment = value.split(",").pop()?.trim() ?? "";
  const showSuggestions = open && focused && fragment !== "" && suggestions.length > 0;

  useEffect(() => {
    if (!focused || !fragment) return;
    const timeout = setTimeout(async () => {
      try {
        const results = await autocompleteTags(fragment);
        setSuggestions(results);
        setOpen(results.length > 0);
        setHighlighted(0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [fragment, focused]);

  const commit = () => {
    setOpen(false);
    onCommit();
  };

  const select = (name: string) => {
    const segments = value.split(",");
    segments[segments.length - 1] = ` ${name}`;
    onChange(segments.join(",").trimStart() + ", ");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const tagList = value.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="publish-tags">Tags</Label>
      <div className="relative">
        <Input
          id="publish-tags"
          ref={inputRef}
          placeholder="webdev, react, tutorial"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setOpen(suggestions.length > 0);
          }}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={(e) => {
            if (showSuggestions) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((i) => (i + 1) % suggestions.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                select(suggestions[highlighted].name);
                return;
              }
              if (e.key === "Escape") {
                setOpen(false);
                return;
              }
            }
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
        {showSuggestions && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(suggestion.name)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                  index === highlighted ? "bg-muted" : "hover:bg-muted"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {suggestion.name}
                  {suggestion.official && (
                    <span className="text-[10px] font-medium tracking-wide text-primary uppercase">
                      Official
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{suggestion.usageCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {tagList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tagList.map((tag) => (
            <span key={tag} className="rounded-sm border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
