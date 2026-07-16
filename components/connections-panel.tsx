"use client"

import { useState } from "react"
import { Link2, Plus, X } from "lucide-react"

import { Idea, Path } from "@/app/editor/types"

interface ConnectionsPanelProps {
  idea: Idea;
  ideas: Record<string, Idea>;
  paths: Path[];
  onSelectIdea: (idea: Idea) => void;
  onLinkIdea: (ideaId: string, otherIdeaId: string) => void;
  onUnlinkIdea: (ideaId: string, otherIdeaId: string) => void;
  onLinkPath: (pathId: string, ideaId: string) => void;
  onOpenGraph: () => void;
}

const MAX_GRAPH_NODES_PER_SIDE = 3;

const SECTION_LABEL_CLASSES = "text-xs font-medium text-muted-foreground";

function truncateLabel(title: string): string {
  return title.length > 14 ? `${title.slice(0, 13)}…` : title;
}

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
}

function layoutArc(count: number, startDeg: number, endDeg: number, cx: number, cy: number, radius: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    positions.push({ x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) });
  }
  return positions;
}

function NeighborhoodGraph({ idea, ideas, paths }: { idea: Idea; ideas: Record<string, Idea>; paths: Path[] }) {
  const linked: GraphNode[] = idea.linkedIdeaIds
    .map((id) => ideas[id])
    .filter((linkedIdea): linkedIdea is Idea => Boolean(linkedIdea))
    .slice(0, MAX_GRAPH_NODES_PER_SIDE)
    .map((linkedIdea) => ({ id: linkedIdea.id, title: linkedIdea.title, x: 0, y: 0 }));

  const siblingIds = new Set<string>();
  for (const path of paths) {
    if (!path.ideaIds.includes(idea.id)) continue;
    for (const siblingId of path.ideaIds) {
      if (siblingId === idea.id) continue;
      if (idea.linkedIdeaIds.includes(siblingId)) continue;
      siblingIds.add(siblingId);
    }
  }
  const siblings: GraphNode[] = Array.from(siblingIds)
    .map((id) => ideas[id])
    .filter((siblingIdea): siblingIdea is Idea => Boolean(siblingIdea))
    .slice(0, MAX_GRAPH_NODES_PER_SIDE)
    .map((siblingIdea) => ({ id: siblingIdea.id, title: siblingIdea.title, x: 0, y: 0 }));

  const cx = 122;
  const cy = 78;
  const linkedPositions = layoutArc(linked.length, 45, 135, cx, cy, 56);
  const siblingPositions = layoutArc(siblings.length, -135, -45, cx, cy, 50);

  linked.forEach((node, i) => {
    node.x = linkedPositions[i].x;
    node.y = linkedPositions[i].y;
  });
  siblings.forEach((node, i) => {
    node.x = siblingPositions[i].x;
    node.y = siblingPositions[i].y;
  });

  return (
    <svg width="244" height="170" viewBox="0 0 244 170" className="block">
      {siblings.map((node) => (
        <line
          key={`edge-sibling-${node.id}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke="var(--border)"
          strokeWidth={1.5}
        />
      ))}
      {linked.map((node) => (
        <line
          key={`edge-linked-${node.id}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke="var(--primary)"
          strokeWidth={1.5}
        />
      ))}
      {siblings.map((node) => (
        <circle
          key={`node-sibling-${node.id}`}
          cx={node.x}
          cy={node.y}
          r={5}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
        />
      ))}
      {linked.map((node) => (
        <circle
          key={`node-linked-${node.id}`}
          cx={node.x}
          cy={node.y}
          r={6}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
        />
      ))}
      <circle cx={cx} cy={cy} r={8} fill="var(--primary)" />
      <text x={cx} y={cy + 32} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)">
        this idea
      </text>
      {siblings.map((node) => (
        <text
          key={`label-sibling-${node.id}`}
          x={node.x}
          y={node.y + (node.y < cy ? -10 : 20)}
          textAnchor="middle"
          fontSize={9}
          fill="var(--muted-foreground)"
        >
          {truncateLabel(node.title)}
        </text>
      ))}
      {linked.map((node) => (
        <text
          key={`label-linked-${node.id}`}
          x={node.x}
          y={node.y + (node.y < cy ? -10 : 20)}
          textAnchor="middle"
          fontSize={9}
          fill="var(--muted-foreground)"
        >
          {truncateLabel(node.title)}
        </text>
      ))}
    </svg>
  );
}

export function ConnectionsPanel({
  idea,
  ideas,
  paths,
  onSelectIdea,
  onLinkIdea,
  onUnlinkIdea,
  onLinkPath,
  onOpenGraph,
}: ConnectionsPanelProps) {
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [ideaSelection, setIdeaSelection] = useState("");
  const [isAddingPath, setIsAddingPath] = useState(false);
  const [pathSelection, setPathSelection] = useState("");

  const linkedIdeas = idea.linkedIdeaIds
    .map((id) => ideas[id])
    .filter((linked): linked is Idea => Boolean(linked));
  const linkableIdeas = Object.values(ideas).filter(
    (other) => other.id !== idea.id && !idea.linkedIdeaIds.includes(other.id)
  );

  const memberPaths = paths.filter((path) => path.ideaIds.includes(idea.id));
  const linkablePaths = paths.filter((path) => !path.ideaIds.includes(idea.id));

  const submitLinkIdea = () => {
    if (!ideaSelection) return;
    onLinkIdea(idea.id, ideaSelection);
    setIsAddingIdea(false);
    setIdeaSelection("");
  };

  const submitLinkPath = () => {
    if (!pathSelection) return;
    onLinkPath(pathSelection, idea.id);
    setIsAddingPath(false);
    setPathSelection("");
  };

  return (
    <div className="flex w-72 shrink-0 flex-col gap-[22px] overflow-hidden rounded-2xl bg-card py-5 px-4">
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className={SECTION_LABEL_CLASSES}>Linked ideas</span>
          <button
            type="button"
            aria-label="Link an idea"
            onClick={() => setIsAddingIdea(true)}
            className="cursor-pointer"
          >
            <Plus className="h-[15px] w-[15px]" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {linkedIdeas.map((linked) => (
            <div
              key={linked.id}
              className="group/linked flex items-center gap-2 rounded-sm border border-border bg-popover py-[9px] px-2.5 transition-colors hover:border-primary"
            >
              <button
                type="button"
                onClick={() => onSelectIdea(linked)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
              >
                <Link2 className="h-[13px] w-[13px] shrink-0 text-primary" />
                <span className="truncate text-[13px] font-medium">{linked.title}</span>
              </button>
              <button
                type="button"
                aria-label={`Unlink ${linked.title}`}
                className="shrink-0 cursor-pointer opacity-0 hover:opacity-70 group-hover/linked:opacity-100"
                onClick={() => onUnlinkIdea(idea.id, linked.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {linkedIdeas.length === 0 && !isAddingIdea && (
            <span className="text-xs italic text-muted-foreground">
              None yet
            </span>
          )}
          {isAddingIdea && (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
                value={ideaSelection}
                onChange={(e) => setIdeaSelection(e.target.value)}
              >
                <option value="" disabled>
                  Choose an idea...
                </option>
                {linkableIdeas.map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-7 px-2 text-xs font-semibold disabled:opacity-40"
                disabled={!ideaSelection}
                onClick={submitLinkIdea}
              >
                Link
              </button>
              <button type="button" className="h-7 px-2 text-xs" onClick={() => setIsAddingIdea(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className={`mb-2.5 ${SECTION_LABEL_CLASSES}`}>
          In paths
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {memberPaths.map((path) => (
            <span
              key={path.id}
              className="rounded-sm text-[11px] font-medium bg-secondary text-secondary-foreground py-1 px-2.5"
            >
              {path.title}
            </span>
          ))}
          {isAddingPath ? (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                className="h-7 rounded-md border border-input bg-background px-1 text-xs"
                value={pathSelection}
                onChange={(e) => setPathSelection(e.target.value)}
              >
                <option value="" disabled>
                  Choose a path...
                </option>
                {linkablePaths.map((path) => (
                  <option key={path.id} value={path.id}>
                    {path.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-7 px-2 text-xs font-semibold disabled:opacity-40"
                disabled={!pathSelection}
                onClick={submitLinkPath}
              >
                Link
              </button>
              <button type="button" className="h-7 px-2 text-xs" onClick={() => setIsAddingPath(false)}>
                Cancel
              </button>
            </div>
          ) : (
            linkablePaths.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAddingPath(true)}
                className="flex items-center gap-1 rounded-sm border border-dashed border-input py-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-2.5 w-2.5" />
                Add
              </button>
            )
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className={SECTION_LABEL_CLASSES}>Graph preview</span>
          <button
            type="button"
            onClick={onOpenGraph}
            className="cursor-pointer text-[11px] font-medium text-primary"
          >
            Open graph
          </button>
        </div>
        <NeighborhoodGraph idea={idea} ideas={ideas} paths={paths} />
      </div>
    </div>
  );
}
