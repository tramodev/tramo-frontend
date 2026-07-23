import { ChevronRight, GitBranch, Link2, ListPlus, Plus, Trash2 } from "lucide-react"
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Trail, Item } from "@/app/editor/types"

interface SidebarCustomProps {
  trails: Trail[];
  items: Record<string, Item>;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
  onCreateTrail: (title: string) => void;
  onCreateItem: (trailId: string, title: string) => void;
  onLinkItemToTrail: (trailId: string, itemId: string) => void;
  onRenameTrail: (trailId: string, title: string) => void;
  onRenameItem: (itemId: string, title: string) => void;
  onDeleteTrail: (trailId: string) => void;
  onUnlinkItemFromTrail: (trailId: string, itemId: string) => void;
}

export function SidebarCustom({
  trails,
  items,
  selectedItemId,
  onSelectItem,
  onCreateTrail,
  onCreateItem,
  onLinkItemToTrail,
  onRenameTrail,
  onRenameItem,
  onDeleteTrail,
  onUnlinkItemFromTrail,
}: SidebarCustomProps) {
  const { state } = useSidebar();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creatingItemTrailId, setCreatingItemTrailId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [linkingTrailId, setLinkingTrailId] = useState<string | null>(null);
  const [linkSelection, setLinkSelection] = useState("");
  const [addToTrailItemId, setAddToTrailItemId] = useState<string | null>(null);
  const [addTrailSelection, setAddTrailSelection] = useState("");

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
    setAddTrailSelection("");
  };

  const submitAddToTrail = (itemId: string) => {
    if (addToTrailItemId !== itemId || !addTrailSelection) return;
    onLinkItemToTrail(addTrailSelection, itemId);
    setAddToTrailItemId(null);
    setAddTrailSelection("");
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
      description: "Any items that only belong to it will be deleted too. This can't be undone.",
      onConfirm: () => onDeleteTrail(trail.id),
    });
  };

  const confirmUnlinkItem = (trail: Trail, item: Item) => {
    const memberTrails = trailsForItem(item.id);
    const isLastTrail = memberTrails.length <= 1;
    setPendingConfirm({
      title: isLastTrail
        ? `Delete item "${item.title}"?`
        : `Remove item "${item.title}" from trail "${trail.title}"?`,
      description: isLastTrail
        ? "This can't be undone."
        : `It will remain in ${memberTrails.length - 1} other trail(s).`,
      onConfirm: () => onUnlinkItemFromTrail(trail.id, item.id),
    });
  };

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="top-16 h-[calc(100svh-64px)] pt-0 px-3 pb-3"
    >
      <SidebarContent>
        <SidebarGroup>
          <div className="flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium text-sidebar-foreground/70">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <SidebarTrigger className="h-5 w-5" />
              {state !== "collapsed" && "My Trails"}
            </span>
            {state !== "collapsed" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="overflow-hidden">
            <div
              className={`transition-transform duration-200 ease-linear ${
                state === "collapsed" ? "-translate-x-full pointer-events-none" : "translate-x-0"
              }`}
              aria-hidden={state === "collapsed"}
            >
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
                                <span className="rounded-sm border border-border px-1 text-[9px] font-normal leading-tight text-muted-foreground">
                                  v{trail.version}
                                </span>
                                <span className="text-[11px] font-normal text-muted-foreground">
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
                            {linkableItems.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0 opacity-0 group-hover/trail:opacity-100"
                                title="Link an existing item into this trail"
                                onClick={() => startLinkingItem(trail.id)}
                              >
                                <Link2 className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0 opacity-0 group-hover/trail:opacity-100"
                              onClick={() => confirmDeleteTrail(trail)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
                          {trailItems.map((item) => {
                            const memberTrails = trailsForItem(item.id);
                            const isShared = memberTrails.length > 1;
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
                                            <Link2
                                              className="ml-1 h-3 w-3 shrink-0 text-primary"
                                            />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-56">
                                            <p className="font-medium">
                                              Also in: {memberTrails
                                                .filter((p) => p.id !== trail.id)
                                                .map((p) => p.title)
                                                .join(", ")}
                                            </p>
                                            <p className="mt-1 text-muted-foreground">
                                              Live in {memberTrails.length} of your own trails — edit once and every
                                              trail updates. A fork by another trailblazer would take a frozen
                                              snapshot instead.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </SidebarMenuSubButton>
                                    {addableTrails.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 shrink-0 opacity-0 group-hover/item:opacity-100"
                                        title="Add this item to another trail"
                                        onClick={() => startAddToTrail(item.id)}
                                      >
                                        <ListPlus className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 shrink-0 opacity-0 group-hover/item:opacity-100"
                                      onClick={() => confirmUnlinkItem(trail, item)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {addToTrailItemId === item.id && (
                                  <div className="flex items-center gap-1 px-2 py-1">
                                    <select
                                      autoFocus
                                      className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
                                      value={addTrailSelection}
                                      onChange={(e) => setAddTrailSelection(e.target.value)}
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
                                      size="sm"
                                      className="h-7 px-2"
                                      disabled={!addTrailSelection}
                                      onClick={() => submitAddToTrail(item.id)}
                                    >
                                      Add
                                    </Button>
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
            </SidebarMenu>
          </SidebarGroupContent>
            </div>
          </div>
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
