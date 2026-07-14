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
import type { PublicIdea, PublicPath } from "@/lib/public-project"

interface PublicSidebarProps {
  paths: PublicPath[];
  selectedIdeaId?: string;
  onSelectIdea: (idea: PublicIdea) => void;
}

export function PublicSidebar({ paths, selectedIdeaId, onSelectIdea }: PublicSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
            >
              Paths
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {paths.map((path) => (
                <Collapsible key={path.id} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="font-semibold">
                        <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        <span>{path.title}</span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {path.ideas.map((idea) => (
                          <SidebarMenuSubItem key={idea.id}>
                            <SidebarMenuSubButton
                              isActive={selectedIdeaId === idea.id}
                              onClick={() => onSelectIdea(idea)}
                            >
                              <span
                                className="h-2 w-2 shrink-0"
                                style={
                                  selectedIdeaId === idea.id
                                    ? { background: "var(--color-accent)" }
                                    : { border: "1.5px solid var(--color-neutral-600)", boxSizing: "border-box" }
                                }
                              />
                              <span className="truncate">{idea.title}</span>
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
