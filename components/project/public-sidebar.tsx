"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"
import { Mark } from "@/components/layout/logo"
import { SharedNoteIndicator } from "@/components/editor/shared-note-indicator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
  onSelectTrail: (trailId: string) => void;
}

export function PublicSidebar({ homeHref, trails, looseItems, selectedItemId, activeTrailId, onSelectItem, onSelectTrail }: PublicSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");
  const allItems = useMemo(() => [...new Map([...looseItems, ...trails.flatMap(trail => trail.items)].map(item => [item.id, item])).values()], [trails, looseItems]);
  const bodies = useMemo(() => new Map(allItems.map(item => [item.id, searchableText(item.content)])), [allItems]);
  const q = query.trim().toLowerCase();
  const resultTrails = q ? trails.filter(trail => trail.title.toLowerCase().includes(q)) : [];
  const resultItems = q ? allItems.filter(item => item.title.toLowerCase().includes(q) || (q.length >= MIN_SEARCH_LENGTH && bodies.get(item.id)?.includes(q))) : [];

  const selectItem = (item: PublicItem, trailId?: string) => {
    onSelectItem(item, trailId);
    setQuery("");
    setOpenMobile(false);
  };

  const selectTrail = (trailId: string) => {
    onSelectTrail(trailId);
    setQuery("");
    setOpenMobile(false);
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r">
      <SidebarContent className="project-sidebar gap-0.5 overflow-x-hidden">
        {state !== "collapsed" && <>
          <div className="flex items-center gap-2 px-2.5 pt-4">
            <Link href={homeHref} title="Back to projects" className="shrink-0"><Mark size={26} /></Link>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} placeholder="Search this project" aria-label="Search this project" className="h-8 pl-8 rounded-full" onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setQuery(""); }} />
            </div>
          </div>
          {q && <SidebarGroup className="py-1">
            <div className="flex h-8 shrink-0 items-center px-2 text-xs font-medium text-muted-foreground">Results</div>
            <SidebarGroupContent className="pl-2">
              <SidebarMenu>
                {resultTrails.length > 0 && <p className="px-2 pt-1 text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Trails</p>}
                {resultTrails.map(trail => <SidebarMenuItem key={`result-trail-${trail.id}`} className="-ml-4 -mr-2">
                  <SidebarMenuButton className="rounded-none pl-6" onClick={() => selectTrail(trail.id)}>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{trail.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
                {resultItems.length > 0 && <p className="px-2 pt-1 text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Notes</p>}
                {resultItems.map(item => <SidebarMenuItem key={`result-item-${item.id}`} className="-ml-4 -mr-2">
                  <SidebarMenuButton className="rounded-none pl-6" isActive={selectedItemId === item.id} onClick={() => selectItem(item)}>
                    <span className={selectedItemId === item.id ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary" : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"} />
                    <span className="truncate">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
                {resultTrails.length === 0 && resultItems.length === 0 && <p className="px-2 py-1 text-xs italic text-muted-foreground">No matches</p>}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
          <div className={q ? "hidden" : "contents"}>
            <Collapsible defaultOpen className="group/trails">
              <SidebarGroup className="py-1">
                <div className="flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground">
                  <CollapsibleTrigger asChild><button type="button" className="flex flex-1 items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/trails:rotate-90" />Trails</button></CollapsibleTrigger>
                  <span className="text-[0.6875rem] font-normal group-data-[state=open]/trails:hidden">{trails.length}</span>
                </div>
                <CollapsibleContent className="pl-2">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {trails.map(trail => <Collapsible key={trail.id} defaultOpen className="group/collapsible">
                        <SidebarMenuItem>
                          <div data-active={activeTrailId === trail.id} className="-ml-4 -mr-2 flex items-center hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent">
                            <CollapsibleTrigger asChild>
                              <button type="button" aria-label={`Toggle ${trail.title}`} className="shrink-0 py-2 pl-6 hover:bg-primary/10">
                                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                              </button>
                            </CollapsibleTrigger>
                            <SidebarMenuButton className="min-w-0 flex-1 rounded-none font-semibold hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent" isActive={activeTrailId === trail.id} onClick={() => selectTrail(trail.id)}>
                              <span className="flex-1 truncate">{trail.title}</span>
                              <span className="text-[0.6875rem] font-normal text-muted-foreground group-data-[state=open]/collapsible:hidden">{trail.items.length}</span>
                            </SidebarMenuButton>
                          </div>
                          <CollapsibleContent>
                            <SidebarMenuSub className="relative mx-0 -ml-4 -mr-2 translate-x-0 border-l-0 px-0 before:pointer-events-none before:absolute before:inset-y-0 before:left-7 before:border-l before:border-sidebar-border">
                              {trail.items.map((item, index) => {
                                const isActive = selectedItemId === item.id && activeTrailId === trail.id;
                                return <SidebarMenuSubItem key={item.id} className="border-t-2 border-transparent">
                                  <SidebarMenuSubButton className="w-full translate-x-0 rounded-none pl-10 pr-6" asChild isActive={isActive}>
                                    <button type="button" onClick={() => selectItem(item, trail.id)}>
                                      <span className="w-4 shrink-0 text-right text-[0.625rem] tabular-nums text-muted-foreground">{index + 1}</span>
                                      <span className="min-w-0 flex-1 truncate text-left">{item.title}</span>
                                      <SharedNoteIndicator trails={trails.filter(candidate => candidate.items.some(note => note.id === item.id))} readOnly />
                                    </button>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>;
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>)}
                      {trails.length === 0 && <p className="px-2 py-1 text-xs italic text-muted-foreground">No trails yet</p>}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
            <Collapsible defaultOpen className="group/items">
              <SidebarGroup className="py-1">
                <div className="flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground">
                  <CollapsibleTrigger asChild><button type="button" className="flex flex-1 items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/items:rotate-90" />Notes without a trail</button></CollapsibleTrigger>
                  <span className="text-[0.6875rem] font-normal group-data-[state=open]/items:hidden">{looseItems.length}</span>
                </div>
                <CollapsibleContent className="pl-2">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {looseItems.map(item => {
                        const isActive = selectedItemId === item.id && !activeTrailId;
                        return <SidebarMenuItem key={item.id} className="-ml-4 -mr-2">
                          <SidebarMenuButton className="rounded-none pl-6 pr-6" isActive={isActive} onClick={() => selectItem(item)}>
                            <span className={isActive ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary" : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"} />
                            <span className="truncate">{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>;
                      })}
                      {looseItems.length === 0 && <p className="px-2 py-1 text-xs italic text-muted-foreground">No notes without a trail</p>}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </div>
        </>}
      </SidebarContent>
    </Sidebar>
  )
}
