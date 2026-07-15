"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { Minus, Plus } from "lucide-react"
import type { NodeObject, LinkObject } from "react-force-graph-2d"

import { Idea, Path } from "@/app/editor/types"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const PATH_HUES = [222, 280, 20, 155, 340, 45, 190];

function pathColor(index: number, alpha = 1): string {
  const hue = PATH_HUES[index % PATH_HUES.length];
  return `hsla(${hue}, 62%, 45%, ${alpha})`;
}

type Point = [number, number];

interface GraphNode extends NodeObject {
  id: string;
  name: string;
}

interface GraphLink extends LinkObject {
  source: string;
  target: string;
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

function buildGraphData(ideas: Record<string, Idea>) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const idea of Object.values(ideas)) {
    nodes.push({ id: idea.id, name: idea.title });
  }

  const seenPairs = new Set<string>();
  for (const idea of Object.values(ideas)) {
    for (const otherId of idea.linkedIdeaIds) {
      if (!ideas[otherId]) continue;
      const key = [idea.id, otherId].sort().join("::");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      links.push({ source: idea.id, target: otherId });
    }
  }

  return { nodes, links };
}

export function KnowledgeGraph({ paths, ideas, selectedIdeaId, onSelectIdea }: KnowledgeGraphProps) {
  const { resolvedTheme } = useTheme();
  const graphData = useMemo(() => buildGraphData(ideas), [ideas]);

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graphData.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graphData]);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [colors, setColors] = useState<GraphColors>(FALLBACK_COLORS);

  const drawPathHulls = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      paths.forEach((path, index) => {
        const memberPoints: Point[] = [];
        path.ideaIds.forEach((ideaId) => {
          const ideaNode = nodeById.get(ideaId);
          if (ideaNode && typeof ideaNode.x === "number" && typeof ideaNode.y === "number") {
            memberPoints.push([ideaNode.x, ideaNode.y]);
          }
        });
        if (memberPoints.length === 0) return;

        const strokeColor = pathColor(index);
        const fillColor = pathColor(index, 0.16);

        const cx = memberPoints.reduce((sum, p) => sum + p[0], 0) / memberPoints.length;
        const cy = memberPoints.reduce((sum, p) => sum + p[1], 0) / memberPoints.length;
        const radius =
          Math.max(...memberPoints.map((p) => Math.hypot(p[0] - cx, p[1] - cy)), 0) + 26;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const labelX = cx;
        const labelTopY = cy - radius;

        const fontSize = 11 / globalScale;
        ctx.font = `700 ${fontSize}px Archivo, system-ui, sans-serif`;
        const textWidth = ctx.measureText(path.title).width;
        const padX = 6 / globalScale;
        const padY = 3 / globalScale;
        const boxY = labelTopY - fontSize - padY * 2 - 4 / globalScale;
        const boxX = labelX - textWidth / 2 - padX;
        const boxW = textWidth + padX * 2;
        const boxH = fontSize + padY * 2;

        ctx.fillStyle = colors.bg;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeStyle = strokeColor;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = strokeColor;
        ctx.fillText(path.title, labelX, boxY + padY);
      });
    },
    [paths, nodeById, colors.bg]
  );

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
      className="relative h-full w-full overflow-hidden border border-(--color-divider) bg-[size:24px_24px]"
      style={{
        backgroundColor: colors.bg,
        backgroundImage: `radial-gradient(${colors.neutral400} 1px, transparent 1px)`,
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
          nodeVal={2}
          linkWidth={2}
          linkColor={() => colors.ink}
          linkDirectionalArrowLength={0}
          onRenderFramePre={drawPathHulls}
          onNodeClick={(node) => {
            const graphNode = node as GraphNode;
            const idea = ideas[graphNode.id];
            if (idea) onSelectIdea(idea);
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const graphNode = node as GraphNode;
            const isSelected = graphNode.id === selectedIdeaId;
            const size = isSelected ? 15 : 6;
            const x = graphNode.x ?? 0;
            const y = graphNode.y ?? 0;

            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
            if (isSelected) {
              ctx.fillStyle = colors.accent;
              ctx.fill();
            } else {
              ctx.fillStyle = colors.bg;
              ctx.fill();
              ctx.lineWidth = 1.5 / Math.max(globalScale, 1);
              ctx.strokeStyle = colors.neutral600;
              ctx.stroke();
            }

            const fontSize = (isSelected ? 12 : 10) / globalScale;
            ctx.font = `${isSelected ? "700" : "400"} ${fontSize}px Archivo, system-ui, sans-serif`;
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
        className="absolute bottom-6 right-6 flex border border-(--color-text)"
      >
        <button
          type="button"
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center hover:bg-[var(--color-neutral-200)] bg-(--color-bg)"
          onClick={() => zoomBy(1.4)}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center hover:bg-[var(--color-neutral-200)] bg-(--color-bg) border-l border-(--color-text)"
          onClick={() => zoomBy(1 / 1.4)}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      <div
        className="absolute bottom-6 left-6 flex items-center gap-4 px-3.5 py-2 bg-(--color-bg) border border-(--color-neutral-400)"
      >
        <span
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-(--color-neutral-700)"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-accent)" />
          Selected
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-(--color-neutral-700)"
        >
          <span
            className="h-2.5 w-2.5 rounded-full border border-(--color-neutral-600) box-border"
          />
          Idea
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-(--color-neutral-700)"
        >
          <span
            className="h-2.5 w-2.5 bg-[hsla(222,62%,45%,0.3)] border-[1.5px] border-[hsl(222,62%,45%)]"
          />
          Path (region contains its ideas)
        </span>
      </div>
    </div>
  );
}
