"use client"

import { ChevronRight } from "lucide-react"

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
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { PublicItem, PublicTrail } from "@/lib/public-project"

interface PublicSidebarProps {
  trails: PublicTrail[];
  selectedItemId?: string;
  onSelectItem: (item: PublicItem) => void;
}

export function PublicSidebar({ trails, selectedItemId, onSelectItem }: PublicSidebarProps) {
  return (
    <Sidebar variant="floating" className="top-16 h-[calc(100svh-64px)] pt-0 px-3 pb-3">
      <SidebarContent>
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
      </SidebarContent>
    </Sidebar>
  )
}
