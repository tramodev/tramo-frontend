"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { NodeObject } from "react-force-graph-2d"

import { Item, Trail } from "@/app/editor/types"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface KnowledgeGraphProps {
  trails: Trail[];
  items: Record<string, Item>;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
}

// Placeholder graph — intentionally bare (library defaults). Starting point for
// a redesign; the previous typed-edge / node-shape / legend rendering was removed.
export function KnowledgeGraph({ items, onSelectItem }: KnowledgeGraphProps) {
  const graphData = useMemo(() => {
    const nodes = Object.values(items).map((item) => ({ id: item.id, name: item.title }));
    const seen = new Set<string>();
    const links: { source: string; target: string }[] = [];
    for (const item of Object.values(items)) {
      for (const otherId of item.linkedItemIds) {
        if (!items[otherId]) continue;
        const key = [item.id, otherId].sort().join("::");
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ source: item.id, target: otherId });
      }
    }
    return { nodes, links };
  }, [items]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-2xl bg-popover">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          onNodeClick={(node) => {
            const item = items[(node as NodeObject).id as string];
            if (item) onSelectItem(item);
          }}
        />
      )}
    </div>
  );
}
