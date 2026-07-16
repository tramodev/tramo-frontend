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
    <Sidebar variant="floating" className="top-16 h-[calc(100svh-64px)] pt-0 px-3 pb-3">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="text-xs font-medium text-muted-foreground">
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
                                className={
                                  selectedIdeaId === idea.id
                                    ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                                    : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"
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
