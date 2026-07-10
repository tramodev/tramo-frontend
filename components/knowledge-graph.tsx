"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
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
  onSelectIdea: (idea: Idea) => void;
}

const PALETTE = {
  light: {
    path: "#0061A4",
    idea: "#6B5778",
    membershipLink: "#C4C6CC",
    connectionLink: "#9C6D00",
    text: "#1A1C1E",
  },
  dark: {
    path: "#9ECAFF",
    idea: "#D6BEE4",
    membershipLink: "#45474A",
    connectionLink: "#D9A441",
    text: "#E2E2E6",
  },
};

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

export function KnowledgeGraph({ paths, ideas, onSelectIdea }: KnowledgeGraphProps) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? PALETTE.dark : PALETTE.light;
  const graphData = useMemo(() => buildGraphData(paths, ideas), [paths, ideas]);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-xl border bg-card">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeRelSize={5}
          nodeVal={(node) => ((node as GraphNode).kind === "path" ? 4 : 2)}
          linkWidth={(link) => ((link as GraphLink).kind === "membership" ? 1 : 2)}
          linkColor={(link) =>
            (link as GraphLink).kind === "membership" ? colors.membershipLink : colors.connectionLink
          }
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
            const radius = isPath ? 7 : 4.5;
            const x = graphNode.x ?? 0;
            const y = graphNode.y ?? 0;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = isPath ? colors.path : colors.idea;
            ctx.fill();

            const fontSize = (isPath ? 13 : 11) / globalScale;
            ctx.font = `${isPath ? "600" : "400"} ${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = colors.text;
            ctx.fillText(graphNode.name, x, y + radius + 2);
          }}
        />
      )}
    </div>
  );
}
