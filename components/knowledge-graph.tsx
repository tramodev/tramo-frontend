"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { Minus, Plus } from "lucide-react"
import type { NodeObject, LinkObject } from "react-force-graph-2d"

import { Idea, Path } from "@/app/dashboard/types"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface GraphNode extends NodeObject {
  id: string;
  name: string;
  kind: "path" | "idea";
}

interface GraphLink extends LinkObject {
  source: string;
  target: string;
  kind: "membership" | "connection";
}

interface KnowledgeGraphProps {
  paths: Path[];
  ideas: Record<string, Idea>;
  selectedIdeaId?: string;
  onSelectIdea: (idea: Idea) => void;
}

interface GraphColors {
  bg: string;
  text: string;
  accent: string;
  ink: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
}

const FALLBACK_COLORS: GraphColors = {
  bg: "#f3f2f2",
  text: "#201e1d",
  accent: "#4338ca",
  ink: "#201e1d",
  neutral400: "#bab6b6",
  neutral500: "#9b9797",
  neutral600: "#7d7979",
};

function readColors(el: HTMLElement | null): GraphColors {
  if (!el) return FALLBACK_COLORS;
  const style = getComputedStyle(el);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read("--color-bg", FALLBACK_COLORS.bg),
    text: read("--color-text", FALLBACK_COLORS.text),
    accent: read("--color-accent", FALLBACK_COLORS.accent),
    ink: read("--color-text", FALLBACK_COLORS.ink),
    neutral400: read("--color-neutral-400", FALLBACK_COLORS.neutral400),
    neutral500: read("--color-neutral-500", FALLBACK_COLORS.neutral500),
    neutral600: read("--color-neutral-600", FALLBACK_COLORS.neutral600),
  };
}

function buildGraphData(paths: Path[], ideas: Record<string, Idea>) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const path of paths) {
    nodes.push({ id: path.id, name: path.title, kind: "path" });
  }
  for (const idea of Object.values(ideas)) {
    nodes.push({ id: idea.id, name: idea.title, kind: "idea" });
  }

  for (const path of paths) {
    for (const ideaId of path.ideaIds) {
      if (ideas[ideaId]) {
        links.push({ source: path.id, target: ideaId, kind: "membership" });
      }
    }
  }

  const seenPairs = new Set<string>();
  for (const idea of Object.values(ideas)) {
    for (const otherId of idea.linkedIdeaIds) {
      if (!ideas[otherId]) continue;
      const key = [idea.id, otherId].sort().join("::");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      links.push({ source: idea.id, target: otherId, kind: "connection" });
    }
  }

  return { nodes, links };
}

export function KnowledgeGraph({ paths, ideas, selectedIdeaId, onSelectIdea }: KnowledgeGraphProps) {
  const { resolvedTheme } = useTheme();
  const graphData = useMemo(() => buildGraphData(paths, ideas), [paths, ideas]);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [colors, setColors] = useState<GraphColors>(FALLBACK_COLORS);

  useEffect(() => {
    setColors(readColors(containerRef.current));
  }, [resolvedTheme]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const zoomBy = (factor: number) => {
    const current = graphRef.current?.zoom() ?? 1;
    graphRef.current?.zoom(current * factor, 200);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        border: "2px solid var(--color-divider)",
        background: colors.bg,
        backgroundImage: `radial-gradient(${colors.neutral400} 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeRelSize={5}
          nodeVal={(node) => ((node as GraphNode).kind === "path" ? 4 : 2)}
          linkWidth={(link) => ((link as GraphLink).kind === "connection" ? 2 : 1)}
          linkColor={(link) =>
            (link as GraphLink).kind === "connection" ? colors.ink : colors.neutral500
          }
          linkLineDash={(link) => ((link as GraphLink).kind === "membership" ? [4, 4] : null)}
          linkDirectionalArrowLength={0}
          onNodeClick={(node) => {
            const graphNode = node as GraphNode;
            if (graphNode.kind === "idea") {
              const idea = ideas[graphNode.id];
              if (idea) onSelectIdea(idea);
            } else if (typeof graphNode.x === "number" && typeof graphNode.y === "number") {
              graphRef.current?.centerAt(graphNode.x, graphNode.y, 400);
              graphRef.current?.zoom(3, 400);
            }
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const graphNode = node as GraphNode;
            const isPath = graphNode.kind === "path";
            const isSelected = !isPath && graphNode.id === selectedIdeaId;
            const size = isSelected ? 15 : isPath ? 9 : 6;
            const x = graphNode.x ?? 0;
            const y = graphNode.y ?? 0;

            ctx.beginPath();
            ctx.rect(x - size / 2, y - size / 2, size, size);
            if (isSelected) {
              ctx.fillStyle = colors.accent;
              ctx.fill();
            } else {
              ctx.fillStyle = colors.bg;
              ctx.fill();
              ctx.lineWidth = (isPath ? 2 : 1.5) / Math.max(globalScale, 1);
              ctx.strokeStyle = isPath ? colors.ink : colors.neutral600;
              ctx.stroke();
            }

            const fontSize = (isSelected ? 12 : isPath ? 11 : 10) / globalScale;
            ctx.font = `${isSelected || isPath ? "700" : "400"} ${fontSize}px Archivo, system-ui, sans-serif`;
            const label = graphNode.name;
            const textWidth = ctx.measureText(label).width;
            const padX = 5 / globalScale;
            const padY = 2 / globalScale;
            const labelY = y + size / 2 + 6 / globalScale;

            ctx.fillStyle = colors.bg;
            ctx.fillRect(
              x - textWidth / 2 - padX,
              labelY,
              textWidth + padX * 2,
              fontSize + padY * 2
            );
            ctx.lineWidth = 1 / Math.max(globalScale, 1);
            ctx.strokeStyle = isSelected ? colors.ink : colors.neutral400;
            ctx.strokeRect(
              x - textWidth / 2 - padX,
              labelY,
              textWidth + padX * 2,
              fontSize + padY * 2
            );

            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = colors.text;
            ctx.fillText(label, x, labelY + padY);
          }}
        />
      )}

      <div
        className="absolute bottom-6 right-6 flex"
        style={{ border: "2px solid var(--color-text)" }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center hover:bg-[var(--color-neutral-200)]"
          style={{ background: "var(--color-bg)" }}
          onClick={() => zoomBy(1.4)}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center hover:bg-[var(--color-neutral-200)]"
          style={{ background: "var(--color-bg)", borderLeft: "2px solid var(--color-text)" }}
          onClick={() => zoomBy(1 / 1.4)}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      <div
        className="absolute bottom-6 left-6 flex items-center gap-4 px-3.5 py-2"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-neutral-400)" }}
      >
        <span
          className="flex items-center gap-1.5 text-[11px] uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--color-neutral-700)" }}
        >
          <span className="h-2.5 w-2.5" style={{ background: "var(--color-accent)" }} />
          Selected
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px] uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--color-neutral-700)" }}
        >
          <span
            className="h-2.5 w-2.5"
            style={{ border: "2px solid var(--color-text)", boxSizing: "border-box" }}
          />
          Linked
        </span>
      </div>
    </div>
  );
}
