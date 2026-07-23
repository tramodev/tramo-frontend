import { ChevronRight, GitBranch, Link2, ListPlus, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react"
import { useState } from "react"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Trail, Item } from "@/app/editor/types"

interface SidebarCustomProps {
  trails: Trail[];
  items: Record<string, Item>;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
  onCreateTrail: (title: string) => void;
  onCreateItem: (trailId: string, title: string) => void;
  onCreateLooseItem: (title: string) => void;
  onLinkItemToTrail: (trailId: string, itemId: string) => void;
  onRenameTrail: (trailId: string, title: string) => void;
  onRenameItem: (itemId: string, title: string) => void;
  onDeleteTrail: (trailId: string) => void;
  onUnlinkItemFromTrail: (trailId: string, itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export function SidebarCustom({
  trails,
  items,
  selectedItemId,
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
}: SidebarCustomProps) {
  const { state } = useSidebar();
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

  const trailsForItem = (itemId: string) => trails.filter(trail => trail.itemIds.includes(itemId));
  // The item layer: every item in the project, listed once. An item that's also
  // in a trail shows here (item) AND under its trail (step) — two layers, not a
  // duplicate. Object.values is unique by id, so no in-list repetition.
  const allItems = Object.values(items);

  // Search filters both layers by title; a matching item also surfaces its trail.
  const q = query.trim().toLowerCase();
  const visibleItems = q ? allItems.filter((i) => i.title.toLowerCase().includes(q)) : allItems;
  const visibleTrails = q
    ? trails.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.itemIds.some((id) => items[id]?.title.toLowerCase().includes(q))
      )
    : trails;

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
    const title = newItemTitle.trim();
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

  const startAddToTrail = (itemId: string) => {
    setAddToTrailItemId(itemId);
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
      description: "Its items are kept — they stay in the Items list. This can't be undone.",
      onConfirm: () => onDeleteTrail(trail.id),
    });
  };

  const submitNewLooseItem = () => {
    if (!isCreatingLoose) return;
    const title = newLooseTitle.trim();
    if (title) onCreateLooseItem(title);
    setNewLooseTitle("");
    setIsCreatingLoose(false);
  };

  const confirmDeleteItem = (item: Item) => {
    setPendingConfirm({
      title: `Delete item "${item.title}"?`,
      description: "It's removed from every trail and the project. This can't be undone.",
      onConfirm: () => onDeleteItem(item.id),
    });
  };

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r"
    >
      <SidebarContent className="gap-0.5">
        {state !== "collapsed" && (
          <div className="px-2.5 pt-4 ">
            <div className="relative ">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Buscar en el memex"
                className="h-8 pl-8 rounded-full"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {state !== "collapsed" && (
          <>
            {/* Trails — the sequence layer: numbered steps. */}
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
                    <span className="text-[11px] font-normal">{visibleTrails.length}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" title="New trail" onClick={() => setIsCreating(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
                <CollapsibleContent>
                  {isCreating && (
                    <div className="px-2 pb-2">
                      <Input
                        autoFocus
                        value={newTitle}
                        placeholder="Trail title..."
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewTrail();
                          if (e.key === "Escape") {
                            setNewTitle("");
                            setIsCreating(false);
                          }
                        }}
                        onBlur={submitNewTrail}
                      />
                    </div>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleTrails.map((trail) => {
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
                                  <Input
                                    autoFocus
                                    value={editingTrailTitle}
                                    className="h-7"
                                    onChange={(e) => setEditingTrailTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") submitEditTrail(trail.id);
                                      if (e.key === "Escape") {
                                        setEditingTrailId(null);
                                        setEditingTrailTitle("");
                                      }
                                    }}
                                    onBlur={() => submitEditTrail(trail.id)}
                                  />
                                ) : (
                                  <>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuButton onDoubleClick={() => startEditTrail(trail)} className="font-semibold">
                                        <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        <span className="flex-1 truncate">{trail.title}</span>
                                        {/* Item count only while collapsed — expanded, the items themselves are visible. */}
                                        <span className="text-[11px] font-normal text-muted-foreground group-data-[state=open]/collapsible:hidden">
                                          {trailItems.length}
                                        </span>
                                      </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 shrink-0"
                                      title="New item"
                                      onClick={() => setCreatingItemTrailId(trail.id)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 shrink-0 opacity-0 group-hover/trail:opacity-100 data-[state=open]:opacity-100"
                                          title="Trail actions"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        {linkableItems.length > 0 && (
                                          <DropdownMenuItem onSelect={() => startLinkingItem(trail.id)}>
                                            <Link2 className="h-3.5 w-3.5" />
                                            Link existing item
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
                                      Choose an item...
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
                                    Link
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
                                      <SidebarMenuSubItem key={item.id} className="group/item">
                                        {editingItemId === item.id ? (
                                          <Input
                                            autoFocus
                                            value={editingItemTitle}
                                            className="h-7"
                                            onChange={(e) => setEditingItemTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") submitEditItem(item.id);
                                              if (e.key === "Escape") {
                                                setEditingItemId(null);
                                                setEditingItemTitle("");
                                              }
                                            }}
                                            onBlur={() => submitEditItem(item.id)}
                                          />
                                        ) : (
                                          <div className="flex items-center">
                                            <SidebarMenuSubButton
                                              isActive={selectedItemId === item.id}
                                              onClick={() => onSelectItem(item)}
                                              onDoubleClick={() => startEditItem(item)}
                                              className={
                                                selectedItemId === item.id
                                                  ? "bg-secondary text-secondary-foreground"
                                                  : undefined
                                              }
                                            >
                                              {/* Step number — this is the sequence layer, order matters here. */}
                                              <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                                                {index + 1}
                                              </span>
                                              <span className="truncate">{item.title}</span>
                                            </SidebarMenuSubButton>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 shrink-0 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100"
                                                  title="Item actions"
                                                >
                                                  <MoreHorizontal className="h-3 w-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start">
                                                {addableTrails.length > 0 && (
                                                  <DropdownMenuItem onSelect={() => startAddToTrail(item.id)}>
                                                    <ListPlus className="h-3.5 w-3.5" />
                                                    Add to another trail
                                                  </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => onUnlinkItemFromTrail(trail.id, item.id)}>
                                                  <X className="h-3.5 w-3.5" />
                                                  Remove from this trail
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}
                                        {addToTrailItemId === item.id && (
                                          <div className="flex items-center gap-1 px-2 py-1">
                                            <select
                                              autoFocus
                                              className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
                                              defaultValue=""
                                              onChange={(e) => {
                                                const trailId = e.target.value;
                                                if (trailId) onLinkItemToTrail(trailId, item.id);
                                                setAddToTrailItemId(null);
                                              }}
                                            >
                                              <option value="" disabled>
                                                Add to trail...
                                              </option>
                                              {addableTrails.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                  {t.title}
                                                </option>
                                              ))}
                                            </select>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 px-2"
                                              onClick={() => setAddToTrailItemId(null)}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        )}
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                  {creatingItemTrailId === trail.id && (
                                    <SidebarMenuSubItem>
                                      <Input
                                        autoFocus
                                        value={newItemTitle}
                                        placeholder="Item title..."
                                        className="h-7"
                                        onChange={(e) => setNewItemTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") submitNewItem(trail.id);
                                          if (e.key === "Escape") {
                                            setNewItemTitle("");
                                            setCreatingItemTrailId(null);
                                          }
                                        }}
                                        onBlur={() => submitNewItem(trail.id)}
                                      />
                                    </SidebarMenuSubItem>
                                  )}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        );
                      })}
                      {visibleTrails.length === 0 && !isCreating && (
                        <p className="px-2 py-1 text-xs italic text-muted-foreground">
                          {q ? "No matches" : "No trails yet"}
                        </p>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Items — the item layer: every item, listed once. */}
            <Collapsible defaultOpen className="group/items">
              <SidebarGroup className="py-1">
                <div className="flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground">
                  <CollapsibleTrigger asChild>
                    <button className="flex flex-1 items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/items:rotate-90" />
                      Items
                    </button>
                  </CollapsibleTrigger>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] font-normal">{visibleItems.length}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" title="New item" onClick={() => setIsCreatingLoose(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
                <CollapsibleContent>
                  {isCreatingLoose && (
                    <div className="px-2 pb-2">
                      <Input
                        autoFocus
                        value={newLooseTitle}
                        placeholder="Item title..."
                        className="h-7"
                        onChange={(e) => setNewLooseTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewLooseItem();
                          if (e.key === "Escape") { setNewLooseTitle(""); setIsCreatingLoose(false); }
                        }}
                        onBlur={submitNewLooseItem}
                      />
                    </div>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
                        const memberTrails = trailsForItem(item.id);
                        // Chain = real transclusion: the item lives in more than one trail.
                        const isShared = memberTrails.length > 1;
                        const addableTrails = trails.filter((t) => !t.itemIds.includes(item.id));
                        return (
                        <SidebarMenuItem key={item.id} className="group/loose">
                          {editingItemId === item.id ? (
                            <Input
                              autoFocus
                              value={editingItemTitle}
                              className="h-7"
                              onChange={(e) => setEditingItemTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitEditItem(item.id);
                                if (e.key === "Escape") { setEditingItemId(null); setEditingItemTitle(""); }
                              }}
                              onBlur={() => submitEditItem(item.id)}
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
                                        In: {memberTrails.map((p) => p.title).join(", ")}
                                      </p>
                                      <p className="mt-1 text-muted-foreground">
                                        Live in {memberTrails.length} of your own trails — edit once and every
                                        trail updates. A fork by another trailblazer would take a frozen
                                        snapshot instead.
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
                                    className="h-5 w-5 shrink-0 opacity-0 group-hover/loose:opacity-100 data-[state=open]:opacity-100"
                                    title="Item actions"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {addableTrails.length > 0 && (
                                    <DropdownMenuItem onSelect={() => startAddToTrail(item.id)}>
                                      <ListPlus className="h-3.5 w-3.5" />
                                      Add to a trail
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onSelect={() => confirmDeleteItem(item)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete item
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                          {addToTrailItemId === item.id && (
                            <div className="flex items-center gap-1 px-2 py-1">
                              <select
                                autoFocus
                                className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
                                defaultValue=""
                                onChange={(e) => {
                                  const trailId = e.target.value;
                                  if (trailId) onLinkItemToTrail(trailId, item.id);
                                  setAddToTrailItemId(null);
                                }}
                              >
                                <option value="" disabled>Add to trail...</option>
                                {addableTrails.map((t) => (
                                  <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                              </select>
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setAddToTrailItemId(null)}>
                                Cancel
                              </Button>
                            </div>
                          )}
                        </SidebarMenuItem>
                        );
                      })}
                      {visibleItems.length === 0 && !isCreatingLoose && (
                        <p className="px-2 py-1 text-xs italic text-muted-foreground">
                          {q ? "No matches" : "No items yet"}
                        </p>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </>
        )}
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
