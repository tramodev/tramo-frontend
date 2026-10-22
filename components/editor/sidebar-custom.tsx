// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { ArrowDown, ArrowUp, ChevronRight, GitBranch, Link2, ListPlus, MoreVertical, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Mark } from "@/components/layout/logo"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SharedNoteIndicator } from "@/components/editor/shared-note-indicator"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Trail, Item } from "@/app/editor/types"
import { MIN_SEARCH_LENGTH } from "@/app/editor/editor-utils"
import { searchProjectItems } from "@/lib/projects-store"

const EMPTY_MATCHES: Set<string> = new Set()

interface SidebarCustomProps {
  draft?: boolean;
  onDraftTrailTitleChange?: (id: string, title: string) => void;
  onDraftItemTitleChange?: (id: string, title: string) => void;
  homeHref: string;
  projectId: string;
  trails: Trail[];
  items: Record<string, Item>;
  selectedItemId?: string;
  activeTrailId?: string;
  onSelectItem: (item: Item, trailId?: string) => void;
  onCreateTrail: (title: string) => void;
  onCreateItem: (trailId: string, title: string) => void;
  onCreateLooseItem: (title: string) => void;
  onLinkItemToTrail: (trailId: string, itemId: string) => void;
  onRenameTrail: (trailId: string, title: string) => void;
  onRenameItem: (itemId: string, title: string) => void;
  onDeleteTrail: (trailId: string) => void;
  onUnlinkItemFromTrail: (trailId: string, itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onReorderTrailItems: (trailId: string, itemIds: string[]) => void;
  onReorderTrails: (trailIds: string[]) => void;
  trailOrderError?: string | null;
  onMoveItemToTrail: (sourceId: string, targetId: string, itemId: string, targetIndex?: number) => Promise<void>;
}

function InlineInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      value={value}
      maxLength={255}
      placeholder={placeholder}
      className={className}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={onSubmit}
    />
  );
}

function AddToTrailSelect({
  trails,
  onPick,
  onCancel,
}: {
  trails: Trail[];
  onPick: (trailId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <select
        autoFocus
        className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
        defaultValue=""
        onChange={(e) => {
          const trailId = e.target.value;
          if (trailId) onPick(trailId);
          onCancel();
        }}
      >
        <option value="" disabled>Add to trail...</option>
        {trails.map((t) => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
      </select>
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export function SidebarCustom({
  draft = false,
  onDraftTrailTitleChange,
  onDraftItemTitleChange,
  homeHref,
  projectId,
  trails,
  items,
  selectedItemId,
  activeTrailId,
  onSelectItem,
  onCreateTrail,
  onCreateItem,
  onCreateLooseItem,
  onLinkItemToTrail,
  onRenameTrail,
  onRenameItem,
  onDeleteTrail,
  onUnlinkItemFromTrail,
  onDeleteItem,
  onReorderTrailItems,
  onReorderTrails,
  trailOrderError,
  onMoveItemToTrail,
}: SidebarCustomProps) {
  const { state, setOpen } = useSidebar();
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreatingLoose, setIsCreatingLoose] = useState(false);
  const [newLooseTitle, setNewLooseTitle] = useState("");
  const [creatingItemTrailId, setCreatingItemTrailId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [linkingTrailId, setLinkingTrailId] = useState<string | null>(null);
  const [linkSelection, setLinkSelection] = useState("");
  const [addToTrailItemId, setAddToTrailItemId] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<{ itemId: string; trailId: string } | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [editingTrailId, setEditingTrailId] = useState<string | null>(null);
  const [editingTrailTitle, setEditingTrailTitle] = useState("");
  const [editingItem, setEditingItem] = useState<{ itemId: string; trailId?: string } | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");

  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const [drag, setDrag] = useState<{ trailId: string; itemId: string; overIndex: number | null } | null>(null);
  const [dropTrailId, setDropTrailId] = useState<string | null>(null);
  const [trailDrag, setTrailDrag] = useState<{ trailId: string; overIndex: number | null } | null>(null);

  const reorderTrail = (trailId: string, to: number) => {
    const from = trails.findIndex(trail => trail.id === trailId);
    if (from < 0 || from === to || to < 0 || to >= trails.length) return;
    const next = trails.map(trail => trail.id);
    next.splice(from, 1);
    next.splice(to, 0, trailId);
    onReorderTrails(next);
  };

  const moveItem = (sourceId: string, targetId: string, itemId: string, targetIndex?: number) => {
    setDrag(null);
    setDropTrailId(null);
    setMovingItem(null);
    setMoveError(null);
    void onMoveItemToTrail(sourceId, targetId, itemId, targetIndex).catch(error => setMoveError(error.message));
  };

  const commitDrag = (trail: Trail) => {
    if (!drag || dropTrailId !== trail.id || drag.overIndex === null) {
      setDrag(null);
      return;
    }
    if (drag.trailId !== trail.id) {
      moveItem(drag.trailId, trail.id, drag.itemId, drag.overIndex);
      return;
    }
    const from = trail.itemIds.indexOf(drag.itemId);
    const to = drag.overIndex - (from < drag.overIndex ? 1 : 0);
    setDrag(null);
    setDropTrailId(null);
    if (from < 0 || from === to) return;
    const next = [...trail.itemIds];
    next.splice(from, 1);
    next.splice(to, 0, drag.itemId);
    onReorderTrailItems(trail.id, next);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "p" && event.key !== "P") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setOpen(true);
      const input = searchBoxRef.current?.querySelector("input");
      if (input) input.select();
      else requestAnimationFrame(() => searchBoxRef.current?.querySelector("input")?.select());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const trailsForItem = (itemId: string) => trails.filter(trail => trail.itemIds.includes(itemId));
  const allItems = Object.values(items);

  const q = query.trim().toLowerCase();

  const [bodyMatches, setBodyMatches] = useState<{ query: string; ids: Set<string> }>({
    query: "",
    ids: EMPTY_MATCHES,
  });

  useEffect(() => {
    if (draft || q.length < MIN_SEARCH_LENGTH) return;
    const timeout = setTimeout(() => {
      searchProjectItems(projectId, q)
        .then((ids) => setBodyMatches({ query: q, ids: new Set(ids) }))
        .catch(() => setBodyMatches({ query: q, ids: EMPTY_MATCHES }));
    }, 250);
    return () => clearTimeout(timeout);
  }, [projectId, q, draft]);

  const bodyMatchIds = bodyMatches.query === q ? bodyMatches.ids : EMPTY_MATCHES;

  const matchesItem = (id: string) =>
    items[id]?.title.toLowerCase().includes(q) || bodyMatchIds.has(id);

  const resultTrails = q ? trails.filter((t) => t.title.toLowerCase().includes(q)) : [];
  const resultItems = q ? allItems.filter((i) => matchesItem(i.id)) : [];

  const submitNewTrail = () => {
    if (!isCreating) return;
    const title = newTitle.trim();
    if (title) {
      onCreateTrail(title);
    }
    setNewTitle("");
    setIsCreating(false);
  };

  const submitNewItem = (trailId: string) => {
    if (creatingItemTrailId !== trailId) return;
    const title = newItemTitle.trim() || "Untitled note";
    if (title) {
      onCreateItem(trailId, title);
    }
    setNewItemTitle("");
    setCreatingItemTrailId(null);
  };

  const startLinkingItem = (trailId: string) => {
    setLinkingTrailId(trailId);
    setLinkSelection("");
  };

  const submitLinkItem = (trailId: string) => {
    if (linkingTrailId !== trailId || !linkSelection) return;
    onLinkItemToTrail(trailId, linkSelection);
    setLinkingTrailId(null);
    setLinkSelection("");
  };

  const startEditTrail = (trail: Trail) => {
    setEditingTrailId(trail.id);
    setEditingTrailTitle(trail.title);
  };

  const submitEditTrail = (trailId: string) => {
    if (editingTrailId !== trailId) return;
    const title = editingTrailTitle.trim();
    if (title) {
      onRenameTrail(trailId, title);
    }
    setEditingTrailId(null);
    setEditingTrailTitle("");
  };

  const startEditItem = (item: Item, trailId?: string) => {
    setEditingItem({ itemId: item.id, trailId });
    setEditingItemTitle(item.title);
  };

  const submitEditItem = (itemId: string) => {
    if (editingItem?.itemId !== itemId) return;
    const title = editingItemTitle.trim();
    if (title) {
      onRenameItem(itemId, title);
    }
    setEditingItem(null);
    setEditingItemTitle("");
  };

  const confirmDeleteTrail = (trail: Trail) => {
    setPendingConfirm({
      title: `Delete trail "${trail.title}"?`,
      description: "Its notes are kept — they stay in the Notes list. This can't be undone.",
      onConfirm: () => onDeleteTrail(trail.id),
    });
  };

  const submitNewLooseItem = () => {
    if (!isCreatingLoose) return;
    const title = newLooseTitle.trim() || "Untitled note";
    if (title) onCreateLooseItem(title);
    setNewLooseTitle("");
    setIsCreatingLoose(false);
  };

  const confirmDeleteItem = (item: Item) => {
    setPendingConfirm({
      title: `Delete note "${item.title}"?`,
      description: "It's removed from every trail and the project. This can't be undone.",
      onConfirm: () => onDeleteItem(item.id),
    });
  };

  return (
    <Sidebar
      data-tour="sidebar"
      variant="sidebar"
      collapsible="icon"
      className="border-r"
    >
      <SidebarContent className="project-sidebar gap-0.5 overflow-x-hidden">
        {state !== "collapsed" && (
          <div className="flex items-center gap-2 px-2.5 pt-4">
            <Link href={homeHref} title="Back to projects" className="shrink-0">
              <Mark size={26} />
            </Link>
            <div className="relative flex-1" ref={searchBoxRef}>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Search this project"
                className="h-8 pl-8 rounded-full"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    return;
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    resultsRef.current?.querySelector<HTMLElement>("button")?.focus();
                  }
                }}
              />
            </div>
          </div>
        )}

        {state !== "collapsed" && q && (
          <SidebarGroup className="py-1">
            <div className="flex h-8 shrink-0 items-center px-2 text-xs font-medium text-muted-foreground">
              Results
            </div>
            <SidebarGroupContent className="pl-2" >
              <div ref={resultsRef}>
              <SidebarMenu>
                {resultTrails.length > 0 && (
                  <p className="px-2 pt-1 text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Trails</p>
                )}
                {resultTrails.map((trail) => (
                  <SidebarMenuItem key={`result-trail-${trail.id}`}>
                    <SidebarMenuButton onClick={() => setQuery("")}>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{trail.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {resultItems.length > 0 && (
                  <p className="px-2 pt-1 text-[0.6875rem] uppercase tracking-wide text-muted-foreground">Notes</p>
                )}
                {resultItems.map((item) => (
                  <SidebarMenuItem key={`result-item-${item.id}`}>
                    <SidebarMenuButton
                      isActive={selectedItemId === item.id}
                      onClick={() => {
                        onSelectItem(item);
                        setQuery("");
                      }}
                    >
                      <span
                        className={
                          selectedItemId === item.id
                            ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                            : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"
                        }
                      />
                      <span className={`truncate ${!item.title ? "text-muted-foreground" : ""}`}>{item.title || "Untitled note"}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {resultTrails.length === 0 && resultItems.length === 0 && (
                  <p className="px-2 py-1 text-xs italic text-muted-foreground">No matches</p>
                )}
              </SidebarMenu>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {state !== "collapsed" && (
          <div className={q ? "hidden" : "contents"}>
            <Collapsible defaultOpen className="group/trails">
              <SidebarGroup className="py-1">
                <div className="flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground">
                  <CollapsibleTrigger asChild>
                    <button className="flex flex-1 items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/trails:rotate-90" />
                      Trails
                    </button>
                  </CollapsibleTrigger>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[0.6875rem] font-normal group-data-[state=open]/trails:hidden">{trails.length}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" title="New trail" disabled={draft} onClick={() => setIsCreating(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
                <CollapsibleContent className="pl-2">
                  {moveError && <p role="alert" className="px-2 py-1 text-xs text-destructive">{moveError}</p>}
                  {trailOrderError && <p role="alert" className="px-2 py-1 text-xs text-destructive">{trailOrderError}</p>}
                  {isCreating && (
                    <div className="px-2 pb-2">
                      <InlineInput
                        value={newTitle}
                        placeholder="Trail title..."
                        onChange={setNewTitle}
                        onSubmit={submitNewTrail}
                        onCancel={() => {
                          setNewTitle("");
                          setIsCreating(false);
                        }}
                      />
                    </div>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {trails.map((trail, trailIndex) => {
                        const trailItems = trail.itemIds
                          .map((itemId) => items[itemId])
                          .filter((item): item is Item => Boolean(item));
                        const linkableItems = Object.values(items).filter(
                          (item) => !trail.itemIds.includes(item.id)
                        );

                        return (
                          <Collapsible key={trail.id} defaultOpen className={`group/collapsible relative ${trailDrag?.trailId === trail.id ? "opacity-40" : ""}`}>
                            {trailDrag?.overIndex === trailIndex && <div aria-hidden="true" className="pointer-events-none absolute -left-4 -right-2 top-0 z-10 h-0.5 bg-primary" />}
                            {trailDrag?.overIndex === trails.length && trailIndex === trails.length - 1 && <div aria-hidden="true" className="pointer-events-none absolute -left-4 -right-2 bottom-0 z-10 h-0.5 bg-primary" />}
                            <SidebarMenuItem>
                              <div
                                className={`group/trail -ml-4 -mr-2 flex items-center hover:bg-sidebar-accent ${dropTrailId === trail.id && drag?.overIndex === null ? "bg-accent ring-1 ring-inset ring-primary" : ""}`}
                                draggable={!draft && editingTrailId !== trail.id}
                                onDragStart={event => {
                                  event.stopPropagation();
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData("text/plain", trail.id);
                                  setTrailDrag({ trailId: trail.id, overIndex: null });
                                }}
                                onDragEnd={() => setTrailDrag(null)}
                                onDragOver={event => {
                                  if (trailDrag) {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    setTrailDrag({ ...trailDrag, overIndex: trailIndex + (event.clientY >= rect.top + rect.height / 2 ? 1 : 0) });
                                    return;
                                  }
                                  if (!drag || drag.trailId === trail.id) return;
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                  setDropTrailId(trail.id);
                                  setDrag({ ...drag, overIndex: null });
                                }}
                                onDragLeave={() => setDropTrailId(null)}
                                onDrop={event => {
                                  if (trailDrag) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (trailDrag.overIndex !== null) {
                                      const from = trails.findIndex(candidate => candidate.id === trailDrag.trailId);
                                      reorderTrail(trailDrag.trailId, trailDrag.overIndex - (from < trailDrag.overIndex ? 1 : 0));
                                    }
                                    setTrailDrag(null);
                                    return;
                                  }
                                  if (!drag || drag.trailId === trail.id) return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  moveItem(drag.trailId, trail.id, drag.itemId);
                                }}
                              >
                                {editingTrailId === trail.id ? (
                                  <div className="flex h-8 min-w-0 flex-1 items-center gap-2 pl-6 pr-12">
                                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                    <InlineInput
                                      value={editingTrailTitle}
                                      className="h-7 min-w-0 flex-1 rounded-none border-0 px-0 font-semibold shadow-none"
                                      onChange={title => { setEditingTrailTitle(title); onDraftTrailTitleChange?.(trail.id, title); }}
                                      onSubmit={() => submitEditTrail(trail.id)}
                                      onCancel={() => {
                                        setEditingTrailId(null);
                                        setEditingTrailTitle("");
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuButton className="min-w-0 flex-1 rounded-none pl-6 font-semibold hover:bg-transparent active:bg-transparent">
                                        <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        <span className={`flex-1 truncate ${!trail.title ? "text-muted-foreground" : ""}`}>{trail.title || "My first trail"}</span>
                                        <span className="text-[0.6875rem] font-normal text-muted-foreground group-data-[state=open]/collapsible:hidden">
                                          {trailItems.length}
                                        </span>
                                      </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-auto w-6 shrink-0 self-stretch rounded-none hover:bg-primary/10"
                                      title="New note"
                                      disabled={draft}
                                      onClick={() => setCreatingItemTrailId(trail.id)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-auto w-6 shrink-0 -translate-x-1 self-stretch rounded-none text-muted-foreground opacity-0 hover:bg-primary/10 hover:text-foreground focus-visible:ring-1 focus-visible:ring-inset group-hover/trail:opacity-100 data-[state=open]:text-foreground data-[state=open]:opacity-100"
                                          title="Trail actions"
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        <DropdownMenuItem onSelect={() => startEditTrail(trail)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                          Rename trail
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled={draft || trailIndex === 0} onSelect={() => reorderTrail(trail.id, trailIndex - 1)}>
                                          <ArrowUp className="h-3.5 w-3.5" />
                                          Move trail up
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled={draft || trailIndex === trails.length - 1} onSelect={() => reorderTrail(trail.id, trailIndex + 1)}>
                                          <ArrowDown className="h-3.5 w-3.5" />
                                          Move trail down
                                        </DropdownMenuItem>
                                        {linkableItems.length > 0 && (
                                          <DropdownMenuItem disabled={draft} onSelect={() => startLinkingItem(trail.id)}>
                                            <Link2 className="h-3.5 w-3.5" />
                                            Add existing note
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem disabled={draft} onSelect={() => confirmDeleteTrail(trail)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete trail
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                )}
                              </div>
                              {trail.forkedFrom && (
                                <div className="flex items-center gap-1 px-2 pb-0.5 text-[0.65625rem] italic text-muted-foreground">
                                  <GitBranch className="h-3 w-3 shrink-0" />
                                  forked from {trails.find((t) => t.id === trail.forkedFrom)?.title ?? "another trail"}
                                </div>
                              )}
                              {linkingTrailId === trail.id && (
                                <div className="flex items-center gap-1 px-2 py-1">
                                  <select
                                    autoFocus
                                    className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
                                    value={linkSelection}
                                    onChange={(e) => setLinkSelection(e.target.value)}
                                  >
                                    <option value="" disabled>
                                      Choose a note...
                                    </option>
                                    {linkableItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.title}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2"
                                    disabled={!linkSelection}
                                    onClick={() => submitLinkItem(trail.id)}
                                  >
                                    Add note
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => setLinkingTrailId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                              <CollapsibleContent>
                                <SidebarMenuSub className="relative mx-0 -ml-4 -mr-2 translate-x-0 border-l-0 px-0 before:pointer-events-none before:absolute before:inset-y-0 before:left-7 before:border-l before:border-sidebar-border">
                                  {trailItems.map((item, index) => {
                                    const addableTrails = trails.filter((t) => !t.itemIds.includes(item.id));

                                    return (
                                      <SidebarMenuSubItem
                                        key={item.id}
                                        draggable={!draft && (editingItem?.itemId !== item.id || editingItem.trailId !== trail.id)}
                                        onDragStart={(e) => {
                                          e.dataTransfer.effectAllowed = "move";
                                          setDrag({ trailId: trail.id, itemId: item.id, overIndex: null });
                                        }}
                                        onDragOver={(e) => {
                                          if (!drag) return;
                                          e.preventDefault();
                                          e.dataTransfer.dropEffect = "move";
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const overIndex = index + (e.clientY >= rect.top + rect.height / 2 ? 1 : 0);
                                          setDropTrailId(trail.id);
                                          if (drag.overIndex !== overIndex) setDrag({ ...drag, overIndex });
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          commitDrag(trail);
                                        }}
                                        onDragEnd={() => { setDrag(null); setDropTrailId(null); }}
                                        className={`group/item relative border-t-2 border-transparent ${
                                          drag && dropTrailId === trail.id && drag.overIndex === index
                                            ? "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary"
                                            : ""
                                        } ${drag && dropTrailId === trail.id && drag.overIndex === index + 1 && index === trailItems.length - 1
                                          ? "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary" : ""
                                        } ${drag?.itemId === item.id ? "opacity-40" : ""}`}
                                      >
                                        {editingItem?.itemId === item.id && editingItem.trailId === trail.id ? (
                                          <div className="flex items-center gap-2 pl-10 pr-6">
                                            <span className="w-4 shrink-0 text-right text-[0.625rem] tabular-nums text-muted-foreground">{index + 1}</span>
                                            <InlineInput
                                              value={editingItemTitle}
                                              className="h-7 min-w-0 flex-1 rounded-none border-0 px-0 shadow-none"
                                              onChange={title => { setEditingItemTitle(title); onDraftItemTitleChange?.(item.id, title); }}
                                              onSubmit={() => submitEditItem(item.id)}
                                              onCancel={() => {
                                                setEditingItem(null);
                                                setEditingItemTitle("");
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            data-active={selectedItemId === item.id && activeTrailId === trail.id}
                                            className="flex items-center hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent"
                                          >
                                            <SidebarMenuSubButton
                                              className="min-w-0 flex-1 translate-x-0 rounded-none pl-10 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
                                              isActive={selectedItemId === item.id && activeTrailId === trail.id}
                                              onClick={() => onSelectItem(item, trail.id)}
                                            >
                                              <span className="w-4 shrink-0 text-right text-[0.625rem] tabular-nums text-muted-foreground">
                                                {index + 1}
                                              </span>
                                              <span className={`truncate ${!item.title ? "text-muted-foreground" : ""}`}>{item.title || "Untitled note"}</span>
                                              <SharedNoteIndicator trails={trailsForItem(item.id)} />
                                            </SidebarMenuSubButton>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-auto w-6 shrink-0 -translate-x-1 self-stretch rounded-none text-muted-foreground opacity-0 hover:bg-primary/10 hover:text-foreground focus-visible:ring-1 focus-visible:ring-inset group-hover/item:opacity-100 data-[state=open]:text-foreground data-[state=open]:opacity-100"
                                                  title="Note actions"
                                                >
                                                  <MoreVertical className="h-3 w-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start">
                                                <DropdownMenuItem onSelect={() => startEditItem(item, trail.id)}>
                                                  <Pencil className="h-3.5 w-3.5" />
                                                  Rename note
                                                </DropdownMenuItem>
                                                {trails.length > 1 && (
                                                  <DropdownMenuItem disabled={draft} onSelect={() => setMovingItem({ itemId: item.id, trailId: trail.id })}>
                                                    <ListPlus className="h-3.5 w-3.5" />
                                                    Move to another trail
                                                  </DropdownMenuItem>
                                                )}
                                                {addableTrails.length > 0 && (
                                                  <DropdownMenuItem disabled={draft} onSelect={() => setAddToTrailItemId(item.id)}>
                                                    <ListPlus className="h-3.5 w-3.5" />
                                                    Add to another trail
                                                  </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem disabled={draft} onSelect={() => setPendingConfirm({
                                                  title: `Remove "${item.title}" from this trail?`,
                                                  confirmLabel: "Remove",
                                                  description: "The note is kept in your Notes list. This can't be undone.",
                                                  onConfirm: () => onUnlinkItemFromTrail(trail.id, item.id),
                                                })}>
                                                  <X className="h-3.5 w-3.5" />
                                                  Remove from this trail
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled={draft} onSelect={() => confirmDeleteItem(item)}>
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                  Delete note
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}
                                        {addToTrailItemId === item.id && (
                                          <AddToTrailSelect
                                            trails={addableTrails}
                                            onPick={(trailId) => onLinkItemToTrail(trailId, item.id)}
                                            onCancel={() => setAddToTrailItemId(null)}
                                          />
                                        )}
                                        {movingItem?.itemId === item.id && movingItem.trailId === trail.id && (
                                          <AddToTrailSelect
                                            trails={trails.filter(candidate => candidate.id !== trail.id)}
                                            onPick={targetId => moveItem(trail.id, targetId, item.id)}
                                            onCancel={() => setMovingItem(null)}
                                          />
                                        )}
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                  {creatingItemTrailId === trail.id && (
                                    <SidebarMenuSubItem className="pl-10 pr-8">
                                      <InlineInput
                                        value={newItemTitle}
                                        placeholder="Note title (optional)"
                                        className="h-7"
                                        onChange={setNewItemTitle}
                                        onSubmit={() => submitNewItem(trail.id)}
                                        onCancel={() => {
                                          setNewItemTitle("");
                                          setCreatingItemTrailId(null);
                                        }}
                                      />
                                    </SidebarMenuSubItem>
                                  )}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        );
                      })}
                      {trails.length === 0 && !isCreating && (
                        <p className="px-2 py-1 text-xs italic text-muted-foreground">
                          No trails yet
                        </p>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <Collapsible defaultOpen className="group/items">
              <SidebarGroup className="py-1">
                <div className="flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground">
                  <CollapsibleTrigger asChild>
                    <button className="flex flex-1 items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/items:rotate-90" />
                      Notes
                    </button>
                  </CollapsibleTrigger>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[0.6875rem] font-normal group-data-[state=open]/items:hidden">{allItems.length}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" title="New note" disabled={draft} onClick={() => setIsCreatingLoose(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
                <CollapsibleContent className="pl-2">
                  {isCreatingLoose && (
                    <div className="px-2 pb-2">
                      <InlineInput
                        value={newLooseTitle}
                        placeholder="Note title (optional)"
                        className="h-7"
                        onChange={setNewLooseTitle}
                        onSubmit={submitNewLooseItem}
                        onCancel={() => { setNewLooseTitle(""); setIsCreatingLoose(false); }}
                      />
                    </div>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {allItems.map((item) => {
                        const isActive = selectedItemId === item.id && !activeTrailId;
                        const memberTrails = trailsForItem(item.id);
                        const addableTrails = trails.filter((t) => !t.itemIds.includes(item.id));
                        return (
                        <SidebarMenuItem key={item.id} className="group/loose">
                          {editingItem?.itemId === item.id && editingItem.trailId === undefined ? (
                            <div className="-ml-4 -mr-2 flex items-center gap-2 pl-6 pr-6">
                              <span className={isActive ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary" : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"} />
                              <InlineInput
                                value={editingItemTitle}
                                className="h-7 min-w-0 flex-1 rounded-none border-0 px-0 shadow-none"
                                onChange={title => { setEditingItemTitle(title); onDraftItemTitleChange?.(item.id, title); }}
                                onSubmit={() => submitEditItem(item.id)}
                                onCancel={() => { setEditingItem(null); setEditingItemTitle(""); }}
                              />
                            </div>
                          ) : (
                            <div
                              data-active={isActive}
                              className="-ml-4 -mr-2 flex items-center hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent"
                            >
                              <SidebarMenuButton
                                className="min-w-0 flex-1 rounded-none pl-6 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
                                isActive={isActive}
                                onClick={() => onSelectItem(item)}
                              >
                                <span
                                  className={
                                    isActive
                                      ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                                      : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"
                                  }
                                />
                                <span className={`truncate ${!item.title ? "text-muted-foreground" : ""}`}>{item.title || "Untitled note"}</span>
                                <SharedNoteIndicator trails={memberTrails} />
                              </SidebarMenuButton>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-auto w-6 shrink-0 -translate-x-1 self-stretch rounded-none text-muted-foreground opacity-0 hover:bg-primary/10 hover:text-foreground focus-visible:ring-1 focus-visible:ring-inset group-hover/loose:opacity-100 data-[state=open]:text-foreground data-[state=open]:opacity-100"
                                    title="Note actions"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem onSelect={() => startEditItem(item)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Rename note
                                  </DropdownMenuItem>
                                  {addableTrails.length > 0 && (
                                    <DropdownMenuItem disabled={draft} onSelect={() => setAddToTrailItemId(item.id)}>
                                      <ListPlus className="h-3.5 w-3.5" />
                                      Add to a trail
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem disabled={draft} onSelect={() => confirmDeleteItem(item)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete note
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                          {addToTrailItemId === item.id && (
                            <AddToTrailSelect
                              trails={addableTrails}
                              onPick={(trailId) => onLinkItemToTrail(trailId, item.id)}
                              onCancel={() => setAddToTrailItemId(null)}
                            />
                          )}
                        </SidebarMenuItem>
                        );
                      })}
                      {allItems.length === 0 && !isCreatingLoose && (
                        <p className="px-2 py-1 text-xs italic text-muted-foreground">
                          No notes yet
                        </p>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </div>
        )}
      </SidebarContent>
      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description ?? ""}
        confirmLabel={pendingConfirm?.confirmLabel}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </Sidebar>
  );
}
