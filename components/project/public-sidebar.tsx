// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"

import { Mark } from "@/components/layout/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import type { PublicItem, PublicTrail } from "@/lib/public-project"
import { MIN_SEARCH_LENGTH, searchableText } from "@/app/editor/editor-utils"

interface PublicSidebarProps {
  homeHref: string;
  trails: PublicTrail[];
  looseItems: PublicItem[];
  selectedItemId?: string;
  activeTrailId?: string;
  onSelectItem: (item: PublicItem, trailId?: string) => void;
}

export function PublicSidebar({ homeHref, trails, looseItems, selectedItemId, activeTrailId, onSelectItem }: PublicSidebarProps) {
  const { state } = useSidebar();
  const [query, setQuery] = useState("");

  const bodies = useMemo(
    () =>
      new Map(
        [...looseItems, ...trails.flatMap((t) => t.items)].map((item) => [
          item.id,
          searchableText(item.content),
        ])
      ),
    [trails, looseItems]
  );

  const q = query.trim().toLowerCase();
  const matches = (item: PublicItem) =>
    item.title.toLowerCase().includes(q) ||
    (q.length >= MIN_SEARCH_LENGTH && (bodies.get(item.id)?.includes(q) ?? false));

  const resultTrails = q ? trails.filter((t) => t.title.toLowerCase().includes(q)) : [];
  const resultItems = q
    ? [...looseItems, ...trails.flatMap((t) => t.items)].filter(matches)
    : [];

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r">
      <SidebarContent className="gap-0.5">
        {state !== "collapsed" && (
          <div className="flex items-center gap-2 px-2.5 pt-4">
            <Link href={homeHref} title="Back to projects" className="shrink-0">
              <Mark size={26} />
            </Link>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Search this project"
                className="h-8 pl-8 rounded-full"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        )}
        {state !== "collapsed" && q && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <span className="text-xs font-medium text-muted-foreground">Results</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {resultTrails.length > 0 && (
                  <p className="px-2 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Trails</p>
                )}
                {resultTrails.map((trail) => (
                  <SidebarMenuItem key={`result-trail-${trail.id}`}>
                    <SidebarMenuButton className="font-semibold" onClick={() => setQuery("")}>
                      <ChevronRight />
                      <span className="truncate">{trail.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {resultItems.length > 0 && (
                  <p className="px-2 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
                )}
                {resultItems.map((item) => (
                  <SidebarMenuItem key={`result-item-${item.id}`}>
                    <SidebarMenuButton
                      isActive={selectedItemId === item.id}
                      onClick={() => onSelectItem(item)}
                    >
                      <span
                        className={
                          selectedItemId === item.id
                            ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                            : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"
                        }
                      />
                      <span className="truncate">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {resultTrails.length === 0 && resultItems.length === 0 && (
                  <p className="px-2 py-1 text-xs italic text-muted-foreground">No matches</p>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className={q ? "hidden" : "contents"}>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="text-xs font-medium text-muted-foreground">
              Trails
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trails.map((trail) => (
                <Collapsible key={trail.id} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="font-semibold">
                        <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        <span>{trail.title}</span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {trail.items.map((item) => (
                          <SidebarMenuSubItem key={item.id}>
                            <SidebarMenuSubButton
                              isActive={selectedItemId === item.id && activeTrailId === trail.id}
                              onClick={() => onSelectItem(item, trail.id)}
                            >
                              <span
                                className={
                                  selectedItemId === item.id
                                    ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                                    : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"
                                }
                              />
                              <span className="truncate">{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {looseItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <span className="text-xs font-medium text-muted-foreground">
                Notes
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {looseItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={selectedItemId === item.id}
                      onClick={() => onSelectItem(item)}
                    >
                      <span
                        className={
                          selectedItemId === item.id
                            ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                            : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"
                        }
                      />
                      <span className="truncate">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
