import { ChevronRight, FileText, Folder, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Path, Idea } from "@/app/dashboard/types"

interface SidebarCustomProps {
  paths: Path[];
  selectedIdeaId?: string;
  onSelectIdea: (idea: Idea) => void;
  onCreatePath: (title: string) => void;
  onCreateIdea: (pathId: string, title: string) => void;
  onRenamePath: (pathId: string, title: string) => void;
  onRenameIdea: (pathId: string, ideaId: string, title: string) => void;
  onDeletePath: (pathId: string) => void;
  onDeleteIdea: (pathId: string, ideaId: string) => void;
}

export function SidebarCustom({
  paths,
  selectedIdeaId,
  onSelectIdea,
  onCreatePath,
  onCreateIdea,
  onRenamePath,
  onRenameIdea,
  onDeletePath,
  onDeleteIdea,
}: SidebarCustomProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creatingIdeaPathId, setCreatingIdeaPathId] = useState<string | null>(null);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");

  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [editingPathTitle, setEditingPathTitle] = useState("");
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingIdeaTitle, setEditingIdeaTitle] = useState("");

  const submitNewPath = () => {
    if (!isCreating) return;
    const title = newTitle.trim();
    if (title) {
      onCreatePath(title);
    }
    setNewTitle("");
    setIsCreating(false);
  };

  const submitNewIdea = (pathId: string) => {
    if (creatingIdeaPathId !== pathId) return;
    const title = newIdeaTitle.trim();
    if (title) {
      onCreateIdea(pathId, title);
    }
    setNewIdeaTitle("");
    setCreatingIdeaPathId(null);
  };

  const startEditPath = (path: Path) => {
    setEditingPathId(path.id);
    setEditingPathTitle(path.title);
  };

  const submitEditPath = (pathId: string) => {
    if (editingPathId !== pathId) return;
    const title = editingPathTitle.trim();
    if (title) {
      onRenamePath(pathId, title);
    }
    setEditingPathId(null);
    setEditingPathTitle("");
  };

  const startEditIdea = (idea: Idea) => {
    setEditingIdeaId(idea.id);
    setEditingIdeaTitle(idea.title);
  };

  const submitEditIdea = (pathId: string, ideaId: string) => {
    if (editingIdeaId !== ideaId) return;
    const title = editingIdeaTitle.trim();
    if (title) {
      onRenameIdea(pathId, ideaId, title);
    }
    setEditingIdeaId(null);
    setEditingIdeaTitle("");
  };

  const confirmDeletePath = (path: Path) => {
    if (window.confirm(`Delete path "${path.title}" and all its ideas? This can't be undone.`)) {
      onDeletePath(path.id);
    }
  };

  const confirmDeleteIdea = (pathId: string, idea: Idea) => {
    if (window.confirm(`Delete idea "${idea.title}"? This can't be undone.`)) {
      onDeleteIdea(pathId, idea.id);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>My Paths</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </SidebarGroupLabel>
          {isCreating && (
            <div className="px-2 pb-2">
              <Input
                autoFocus
                value={newTitle}
                placeholder="Path title..."
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNewPath();
                  if (e.key === "Escape") {
                    setNewTitle("");
                    setIsCreating(false);
                  }
                }}
                onBlur={submitNewPath}
              />
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {paths.map((path) => (
                <Collapsible key={path.id} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <div className="group/path flex items-center">
                      {editingPathId === path.id ? (
                        <Input
                          autoFocus
                          value={editingPathTitle}
                          className="h-7"
                          onChange={(e) => setEditingPathTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitEditPath(path.id);
                            if (e.key === "Escape") {
                              setEditingPathId(null);
                              setEditingPathTitle("");
                            }
                          }}
                          onBlur={() => submitEditPath(path.id)}
                        />
                      ) : (
                        <>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton onDoubleClick={() => startEditPath(path)}>
                              <Folder />
                              <span>{path.title}</span>
                              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => setCreatingIdeaPathId(path.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 opacity-0 group-hover/path:opacity-100"
                            onClick={() => confirmDeletePath(path)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {path.ideas.map((idea) => (
                          <SidebarMenuSubItem key={idea.id} className="group/idea">
                            {editingIdeaId === idea.id ? (
                              <Input
                                autoFocus
                                value={editingIdeaTitle}
                                className="h-7"
                                onChange={(e) => setEditingIdeaTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") submitEditIdea(path.id, idea.id);
                                  if (e.key === "Escape") {
                                    setEditingIdeaId(null);
                                    setEditingIdeaTitle("");
                                  }
                                }}
                                onBlur={() => submitEditIdea(path.id, idea.id)}
                              />
                            ) : (
                              <div className="flex items-center">
                                <SidebarMenuSubButton
                                  isActive={selectedIdeaId === idea.id}
                                  onClick={() => onSelectIdea(idea)}
                                  onDoubleClick={() => startEditIdea(idea)}
                                >
                                  <FileText className="mr-2" />
                                  <span>{idea.title}</span>
                                </SidebarMenuSubButton>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 opacity-0 group-hover/idea:opacity-100"
                                  onClick={() => confirmDeleteIdea(path.id, idea)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </SidebarMenuSubItem>
                        ))}
                        {creatingIdeaPathId === path.id && (
                          <SidebarMenuSubItem>
                            <Input
                              autoFocus
                              value={newIdeaTitle}
                              placeholder="Idea title..."
                              className="h-7"
                              onChange={(e) => setNewIdeaTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitNewIdea(path.id);
                                if (e.key === "Escape") {
                                  setNewIdeaTitle("");
                                  setCreatingIdeaPathId(null);
                                }
                              }}
                              onBlur={() => submitNewIdea(path.id)}
                            />
                          </SidebarMenuSubItem>
                        )}
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
  );
}