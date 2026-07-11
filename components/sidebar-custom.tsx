import { ChevronRight, Link2, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Wordmark } from "@/components/logo"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Path, Idea } from "@/app/dashboard/types"

interface SidebarCustomProps {
  paths: Path[];
  ideas: Record<string, Idea>;
  selectedIdeaId?: string;
  onSelectIdea: (idea: Idea) => void;
  onCreatePath: (title: string) => void;
  onCreateIdea: (pathId: string, title: string) => void;
  onLinkIdeaToPath: (pathId: string, ideaId: string) => void;
  onRenamePath: (pathId: string, title: string) => void;
  onRenameIdea: (ideaId: string, title: string) => void;
  onDeletePath: (pathId: string) => void;
  onUnlinkIdeaFromPath: (pathId: string, ideaId: string) => void;
}

export function SidebarCustom({
  paths,
  ideas,
  selectedIdeaId,
  onSelectIdea,
  onCreatePath,
  onCreateIdea,
  onLinkIdeaToPath,
  onRenamePath,
  onRenameIdea,
  onDeletePath,
  onUnlinkIdeaFromPath,
}: SidebarCustomProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creatingIdeaPathId, setCreatingIdeaPathId] = useState<string | null>(null);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [linkingPathId, setLinkingPathId] = useState<string | null>(null);
  const [linkSelection, setLinkSelection] = useState("");

  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [editingPathTitle, setEditingPathTitle] = useState("");
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingIdeaTitle, setEditingIdeaTitle] = useState("");

  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const pathsForIdea = (ideaId: string) => paths.filter(path => path.ideaIds.includes(ideaId));

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

  const startLinkingIdea = (pathId: string) => {
    setLinkingPathId(pathId);
    setLinkSelection("");
  };

  const submitLinkIdea = (pathId: string) => {
    if (linkingPathId !== pathId || !linkSelection) return;
    onLinkIdeaToPath(pathId, linkSelection);
    setLinkingPathId(null);
    setLinkSelection("");
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

  const submitEditIdea = (ideaId: string) => {
    if (editingIdeaId !== ideaId) return;
    const title = editingIdeaTitle.trim();
    if (title) {
      onRenameIdea(ideaId, title);
    }
    setEditingIdeaId(null);
    setEditingIdeaTitle("");
  };

  const confirmDeletePath = (path: Path) => {
    setPendingConfirm({
      title: `Delete path "${path.title}"?`,
      description: "Any ideas that only belong to it will be deleted too. This can't be undone.",
      onConfirm: () => onDeletePath(path.id),
    });
  };

  const confirmUnlinkIdea = (path: Path, idea: Idea) => {
    const memberPaths = pathsForIdea(idea.id);
    const isLastPath = memberPaths.length <= 1;
    setPendingConfirm({
      title: isLastPath
        ? `Delete idea "${idea.title}"?`
        : `Remove idea "${idea.title}" from path "${path.title}"?`,
      description: isLastPath
        ? "This can't be undone."
        : `It will remain in ${memberPaths.length - 1} other path(s).`,
      onConfirm: () => onUnlinkIdeaFromPath(path.id, idea.id),
    });
  };

  return (
    <Sidebar>
      <SidebarHeader style={{ borderBottom: "2px solid var(--color-divider)" }}>
        <Link href="/projects" className="flex items-center px-2 py-1" title="Back to projects">
          <Wordmark />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span
              className="text-[11px] font-bold uppercase"
              style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
            >
              My Paths
            </span>
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
              {paths.map((path) => {
                const pathIdeas = path.ideaIds
                  .map((ideaId) => ideas[ideaId])
                  .filter((idea): idea is Idea => Boolean(idea));
                const linkableIdeas = Object.values(ideas).filter(
                  (idea) => !path.ideaIds.includes(idea.id)
                );

                return (
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
                              <SidebarMenuButton onDoubleClick={() => startEditPath(path)} className="font-semibold">
                                <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                <span>{path.title}</span>
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              title="New idea"
                              onClick={() => setCreatingIdeaPathId(path.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            {linkableIdeas.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0 opacity-0 group-hover/path:opacity-100"
                                title="Link an existing idea into this path"
                                onClick={() => startLinkingIdea(path.id)}
                              >
                                <Link2 className="h-3 w-3" />
                              </Button>
                            )}
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
                      {linkingPathId === path.id && (
                        <div className="flex items-center gap-1 px-2 py-1">
                          <select
                            autoFocus
                            className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
                            value={linkSelection}
                            onChange={(e) => setLinkSelection(e.target.value)}
                          >
                            <option value="" disabled>
                              Choose an idea...
                            </option>
                            {linkableIdeas.map((idea) => (
                              <option key={idea.id} value={idea.id}>
                                {idea.title}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="h-7 px-2"
                            disabled={!linkSelection}
                            onClick={() => submitLinkIdea(path.id)}
                          >
                            Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setLinkingPathId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {pathIdeas.map((idea) => {
                            const memberPaths = pathsForIdea(idea.id);
                            const isShared = memberPaths.length > 1;

                            return (
                              <SidebarMenuSubItem key={idea.id} className="group/idea">
                                {editingIdeaId === idea.id ? (
                                  <Input
                                    autoFocus
                                    value={editingIdeaTitle}
                                    className="h-7"
                                    onChange={(e) => setEditingIdeaTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") submitEditIdea(idea.id);
                                      if (e.key === "Escape") {
                                        setEditingIdeaId(null);
                                        setEditingIdeaTitle("");
                                      }
                                    }}
                                    onBlur={() => submitEditIdea(idea.id)}
                                  />
                                ) : (
                                  <div className="flex items-center">
                                    <SidebarMenuSubButton
                                      isActive={selectedIdeaId === idea.id}
                                      onClick={() => onSelectIdea(idea)}
                                      onDoubleClick={() => startEditIdea(idea)}
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
                                      {isShared && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Link2
                                              className="ml-1 h-3 w-3 shrink-0"
                                              style={{ color: "var(--color-accent)" }}
                                            />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Also in: {memberPaths
                                              .filter((p) => p.id !== path.id)
                                              .map((p) => p.title)
                                              .join(", ")}
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </SidebarMenuSubButton>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 shrink-0 opacity-0 group-hover/idea:opacity-100"
                                      onClick={() => confirmUnlinkIdea(path, idea)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </SidebarMenuSubItem>
                            );
                          })}
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
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description ?? ""}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </Sidebar>
  );
}
