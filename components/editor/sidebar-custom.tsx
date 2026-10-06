import { CircleHelp, ChevronRight, GitBranch, Link2, ListPlus, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react"
import { ShortcutsDialog } from "@/components/editor/shortcuts-dialog"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Mark } from "@/components/layout/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Trail, Item } from "@/app/editor/types"
import { MIN_SEARCH_LENGTH } from "@/app/editor/editor-utils"
import { searchProjectItems } from "@/lib/projects-store"

const EMPTY_MATCHES: Set<string> = new Set()

interface SidebarCustomProps {
  homeHref: string;
  projectId: string;
  trails: Trail[];
  items: Record<string, Item>;
  selectedItemId?: string;
  activeTrailId?: string;
  onHelp: () => void;
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
      value={value}
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
  homeHref,
  projectId,
  trails,
  items,
  selectedItemId,
  activeTrailId,
  onSelectItem,
  onHelp,
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

  const [editingTrailId, setEditingTrailId] = useState<string | null>(null);
  const [editingTrailTitle, setEditingTrailTitle] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");

  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [drag, setDrag] = useState<{ trailId: string; itemId: string; overIndex: number | null } | null>(null);

  const commitDrag = (trail: Trail) => {
    if (!drag || drag.trailId !== trail.id || drag.overIndex === null) {
      setDrag(null);
      return;
    }
    const from = trail.itemIds.indexOf(drag.itemId);
    setDrag(null);
    if (from < 0 || from === drag.overIndex) return;
    const next = [...trail.itemIds];
    next.splice(from, 1);
    next.splice(drag.overIndex, 0, drag.itemId);
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
    if (q.length < MIN_SEARCH_LENGTH) return;
    const timeout = setTimeout(() => {
      searchProjectItems(projectId, q)
        .then((ids) => setBodyMatches({ query: q, ids: new Set(ids) }))
        .catch(() => setBodyMatches({ query: q, ids: EMPTY_MATCHES }));
    }, 250);
    return () => clearTimeout(timeout);
  }, [projectId, q]);

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

  const startEditItem = (item: Item) => {
    setEditingItemId(item.id);
    setEditingItemTitle(item.title);
  };

  const submitEditItem = (itemId: string) => {
    if (editingItemId !== itemId) return;
    const title = editingItemTitle.trim();
    if (title) {
      onRenameItem(itemId, title);
    }
    setEditingItemId(null);
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
      <SidebarContent className="gap-0.5">
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
                  <p className="px-2 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Trails</p>
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
                  <p className="px-2 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
                )}
                {resultItems.map((item) => (
                  <SidebarMenuItem key={`result-item-${item.id}`}>
                    <SidebarMenuButton
                      isActive={selectedItemId === item.id}
                      onClick={() => {
                        onSelectItem(item);
                        setQuery("");
                      }}
                      className={selectedItemId === item.id ? "bg-secondary text-secondary-foreground" : undefined}
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
                    <span className="text-[11px] font-normal group-data-[state=open]/trails:hidden">{trails.length}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" title="New trail" onClick={() => setIsCreating(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
                <CollapsibleContent className="pl-2">
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
                      {trails.map((trail) => {
                        const trailItems = trail.itemIds
                          .map((itemId) => items[itemId])
                          .filter((item): item is Item => Boolean(item));
                        const linkableItems = Object.values(items).filter(
                          (item) => !trail.itemIds.includes(item.id)
                        );

                        return (
                          <Collapsible key={trail.id} defaultOpen className="group/collapsible">
                            <SidebarMenuItem>
                              <div className="group/trail flex items-center">
                                {editingTrailId === trail.id ? (
                                  <InlineInput
                                    value={editingTrailTitle}
                                    className="h-7"
                                    onChange={setEditingTrailTitle}
                                    onSubmit={() => submitEditTrail(trail.id)}
                                    onCancel={() => {
                                      setEditingTrailId(null);
                                      setEditingTrailTitle("");
                                    }}
                                  />
                                ) : (
                                  <>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuButton onDoubleClick={() => startEditTrail(trail)} className="font-semibold">
                                        <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        <span className="flex-1 truncate">{trail.title}</span>
                                        <span className="text-[11px] font-normal text-muted-foreground group-data-[state=open]/collapsible:hidden">
                                          {trailItems.length}
                                        </span>
                                      </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 shrink-0"
                                      title="New note"
                                      onClick={() => setCreatingItemTrailId(trail.id)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover/trail:opacity-100 data-[state=open]:opacity-100"
                                          title="Trail actions"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        {linkableItems.length > 0 && (
                                          <DropdownMenuItem onSelect={() => startLinkingItem(trail.id)}>
                                            <Link2 className="h-3.5 w-3.5" />
                                            Add existing note
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onSelect={() => confirmDeleteTrail(trail)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete trail
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                )}
                              </div>
                              {trail.forkedFrom && (
                                <div className="flex items-center gap-1 px-2 pb-0.5 text-[10.5px] italic text-muted-foreground">
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
                                <SidebarMenuSub>
                                  {trailItems.map((item, index) => {
                                    const addableTrails = trails.filter((t) => !t.itemIds.includes(item.id));

                                    return (
                                      <SidebarMenuSubItem
                                        key={item.id}
                                        draggable={editingItemId !== item.id}
                                        onDragStart={(e) => {
                                          e.dataTransfer.effectAllowed = "move";
                                          setDrag({ trailId: trail.id, itemId: item.id, overIndex: null });
                                        }}
                                        onDragOver={(e) => {
                                          if (!drag || drag.trailId !== trail.id) return;
                                          e.preventDefault();
                                          e.dataTransfer.dropEffect = "move";
                                          if (drag.overIndex !== index) setDrag({ ...drag, overIndex: index });
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          commitDrag(trail);
                                        }}
                                        onDragEnd={() => setDrag(null)}
                                        className={`group/item ${
                                          drag && drag.trailId === trail.id && drag.overIndex === index
                                            ? "border-t-2 border-primary"
                                            : "border-t-2 border-transparent"
                                        } ${drag?.itemId === item.id ? "opacity-40" : ""}`}
                                      >
                                        {editingItemId === item.id ? (
                                          <InlineInput
                                            value={editingItemTitle}
                                            className="h-7"
                                            onChange={setEditingItemTitle}
                                            onSubmit={() => submitEditItem(item.id)}
                                            onCancel={() => {
                                              setEditingItemId(null);
                                              setEditingItemTitle("");
                                            }}
                                          />
                                        ) : (
                                          <div className="flex items-center">
                                            <SidebarMenuSubButton
                                              isActive={selectedItemId === item.id && activeTrailId === trail.id}
                                              onClick={() => onSelectItem(item, trail.id)}
                                              onDoubleClick={() => startEditItem(item)}
                                              className={
                                                selectedItemId === item.id && activeTrailId === trail.id
                                                  ? "bg-secondary text-secondary-foreground"
                                                  : undefined
                                              }
                                            >
                                              <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                                                {index + 1}
                                              </span>
                                              <span className="truncate">{item.title}</span>
                                            </SidebarMenuSubButton>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover/item:opacity-100 data-[state=open]:opacity-100"
                                                  title="Note actions"
                                                >
                                                  <MoreHorizontal className="h-3 w-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start">
                                                {addableTrails.length > 0 && (
                                                  <DropdownMenuItem onSelect={() => setAddToTrailItemId(item.id)}>
                                                    <ListPlus className="h-3.5 w-3.5" />
                                                    Add to another trail
                                                  </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => onUnlinkItemFromTrail(trail.id, item.id)}>
                                                  <X className="h-3.5 w-3.5" />
                                                  Remove from this trail (keep note)
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
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                  {creatingItemTrailId === trail.id && (
                                    <SidebarMenuSubItem>
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
                    <span className="text-[11px] font-normal group-data-[state=open]/items:hidden">{allItems.length}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" title="New note" onClick={() => setIsCreatingLoose(true)}>
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
                        const memberTrails = trailsForItem(item.id);
                        const isShared = memberTrails.length > 1;
                        const addableTrails = trails.filter((t) => !t.itemIds.includes(item.id));
                        return (
                        <SidebarMenuItem key={item.id} className="group/loose">
                          {editingItemId === item.id ? (
                            <InlineInput
                              value={editingItemTitle}
                              className="h-7"
                              onChange={setEditingItemTitle}
                              onSubmit={() => submitEditItem(item.id)}
                              onCancel={() => { setEditingItemId(null); setEditingItemTitle(""); }}
                            />
                          ) : (
                            <div className="flex items-center">
                              <SidebarMenuButton
                                isActive={selectedItemId === item.id}
                                onClick={() => onSelectItem(item)}
                                onDoubleClick={() => startEditItem(item)}
                                className={selectedItemId === item.id ? "bg-secondary text-secondary-foreground" : undefined}
                              >
                                <span
                                  className={
                                    selectedItemId === item.id
                                      ? "h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                                      : "h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border"
                                  }
                                />
                                <span className="truncate">{item.title}</span>
                                {isShared && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link2 className="ml-auto h-3 w-3 shrink-0 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-56">
                                      <p className="font-medium">
                                        Used in {memberTrails.length} trails: {memberTrails.map((p) => p.title).join(", ")}
                                      </p>
                                      <p className="mt-1 text-muted-foreground">
                                        Edits appear in every trail that uses this note.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </SidebarMenuButton>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover/loose:opacity-100 data-[state=open]:opacity-100"
                                    title="Note actions"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {addableTrails.length > 0 && (
                                    <DropdownMenuItem onSelect={() => setAddToTrailItemId(item.id)}>
                                      <ListPlus className="h-3.5 w-3.5" />
                                      Add to a trail
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onSelect={() => confirmDeleteItem(item)}>
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
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <ShortcutsDialog />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onHelp} className="text-muted-foreground">
              <CircleHelp className="h-4 w-4" />
              <span>Help</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
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
