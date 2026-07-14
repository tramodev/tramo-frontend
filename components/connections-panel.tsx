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

function sectionLabelStyle() {
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--color-neutral-600)",
  };
}

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
    <svg width="244" height="170" viewBox="0 0 244 170" style={{ display: "block" }}>
      {siblings.map((node) => (
        <line
          key={`edge-sibling-${node.id}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke="var(--color-neutral-400)"
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
          stroke="var(--color-accent)"
          strokeWidth={1.5}
        />
      ))}
      {siblings.map((node) => (
        <rect
          key={`node-sibling-${node.id}`}
          x={node.x - 5}
          y={node.y - 5}
          width={10}
          height={10}
          fill="none"
          stroke="var(--color-neutral-500)"
          strokeWidth={1.5}
        />
      ))}
      {linked.map((node) => (
        <rect
          key={`node-linked-${node.id}`}
          x={node.x - 6}
          y={node.y - 6}
          width={12}
          height={12}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
        />
      ))}
      <rect x={cx - 8} y={cy - 8} width={16} height={16} fill="var(--color-accent)" />
      <text x={cx} y={cy + 32} textAnchor="middle" fontSize={9} fill="var(--color-neutral-700)">
        this idea
      </text>
      {siblings.map((node) => (
        <text
          key={`label-sibling-${node.id}`}
          x={node.x}
          y={node.y + (node.y < cy ? -10 : 20)}
          textAnchor="middle"
          fontSize={9}
          fill="var(--color-neutral-700)"
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
          fill="var(--color-neutral-700)"
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
    <div
      className="flex w-[280px] shrink-0 flex-col gap-[22px] overflow-hidden"
      style={{ borderLeft: "2px solid var(--color-divider)", padding: "20px 16px" }}
    >
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span style={sectionLabelStyle()}>Linked ideas</span>
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
              className="group/linked flex items-center gap-2"
              style={{ border: "2px solid var(--color-divider)", padding: "9px 10px" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-divider)")}
            >
              <button
                type="button"
                onClick={() => onSelectIdea(linked)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
              >
                <Link2 className="h-[13px] w-[13px] shrink-0" style={{ color: "var(--color-accent)" }} />
                <span className="truncate text-[13px] font-semibold">{linked.title}</span>
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
            <span className="text-xs italic" style={{ color: "var(--color-neutral-600)" }}>
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
        <div className="mb-2.5" style={sectionLabelStyle()}>
          In paths
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {memberPaths.map((path) => (
            <span
              key={path.id}
              className="text-[11px] font-semibold"
              style={{ background: "var(--color-neutral-300)", padding: "4px 10px" }}
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
                className="flex items-center gap-1 text-[11px] font-semibold"
                style={{ border: "2px solid var(--color-divider)", padding: "2px 10px" }}
              >
                <Plus className="h-2.5 w-2.5" />
                Add
              </button>
            )
          )}
        </div>
      </div>

      <div style={{ borderTop: "2px solid var(--color-divider)", paddingTop: 16 }}>
        <div className="mb-2.5 flex items-center justify-between">
          <span style={sectionLabelStyle()}>Graph preview</span>
          <button
            type="button"
            onClick={onOpenGraph}
            className="cursor-pointer text-[11px] font-bold"
            style={{ color: "var(--color-accent-600)" }}
          >
            Open graph
          </button>
        </div>
        <NeighborhoodGraph idea={idea} ideas={ideas} paths={paths} />
      </div>
    </div>
  );
}
