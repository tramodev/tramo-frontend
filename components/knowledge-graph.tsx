"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"

import { Item, Trail, AssociationType } from "@/app/editor/types"
import { ASSOCIATION_META } from "@/app/editor/associations"

interface KnowledgeGraphProps {
  trails: Trail[];
  items: Record<string, Item>;
  activeTrailId?: string;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
  // 'preview' = fit-to-container miniature (no legend, non-interactive) for the panel.
  variant?: "full" | "preview";
}

// Association type → the CSS var holding its edge colour. Resolved to a literal
// hex at runtime (var() doesn't reliably resolve inside SVG presentation attrs).
const TYPE_VAR: Record<AssociationType, string> = {
  REQUIRES: "--ed-blue",
  ELABORATES: "--ed-purple",
  CONTRADICTS: "--ed-red",
  EXAMPLE_OF: "--ed-green",
  RELATED: "--ed-gray",
};

const FALLBACK: Record<string, string> = {
  "--ed-blue": "#0B57D0",
  "--ed-purple": "#6750A4",
  "--ed-red": "#B3261E",
  "--ed-green": "#1B6E38",
  "--ed-gray": "#5F6368",
  "--primary": "#1A1A1A",
  "--primary-foreground": "#FFFFFF",
  "--foreground": "#111111",
};

const NODE_W = 150;
const NODE_H = 54;
const X_GAP = 220;
const MARGIN_X = 80;
const TOP_Y = 140;
const BOTTOM_Y = 360;

function truncate(s: string): string {
  return s.length > 16 ? `${s.slice(0, 15)}…` : s;
}

interface Pos { x: number; y: number }
interface Assoc { from: string; to: string; type: AssociationType }

export function KnowledgeGraph({ trails, items, activeTrailId, selectedItemId, onSelectItem, variant = "full" }: KnowledgeGraphProps) {
  const preview = variant === "preview";
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve the CSS custom properties to literal hex so SVG stroke/fill work.
  const [colors, setColors] = useState<Record<string, string>>(FALLBACK);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Defer a frame: on a theme flip next-themes swaps the .dark class after our
    // effect runs, so an immediate read would resolve the *old* colours.
    const raf = requestAnimationFrame(() => {
      const style = getComputedStyle(el);
      const next: Record<string, string> = {};
      for (const name of Object.keys(FALLBACK)) {
        next[name] = style.getPropertyValue(name).trim() || FALLBACK[name];
      }
      setColors(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [resolvedTheme]);

  const typeColor = (type: AssociationType) => colors[TYPE_VAR[type]] ?? FALLBACK[TYPE_VAR[type]];

  const layout = useMemo(() => {
    // Spine = the active trail's items in order (the "backbone"); fall back to
    // the first trail, then to every item.
    const activeTrail = trails.find((t) => t.id === activeTrailId) ?? trails[0];
    const spineIds = (activeTrail?.itemIds ?? Object.keys(items)).filter((id) => items[id]);
    const spineSet = new Set(spineIds);

    const pos = new Map<string, Pos>();
    spineIds.forEach((id, i) => pos.set(id, { x: MARGIN_X + NODE_W / 2 + i * X_GAP, y: TOP_Y }));

    // Typed item→item associations; targets not on the spine drop to a lower row.
    const assocs: Assoc[] = [];
    let offCount = 0;
    for (const id of spineIds) {
      for (const a of items[id].associations) {
        if (a.targetType !== "ITEM" || !items[a.targetId]) continue;
        assocs.push({ from: id, to: a.targetId, type: a.type });
        if (!spineSet.has(a.targetId) && !pos.has(a.targetId)) {
          const src = pos.get(id)!;
          pos.set(a.targetId, { x: src.x + offCount * 40, y: BOTTOM_Y });
          offCount++;
        }
      }
    }

    const spineEdges = spineIds.slice(0, -1).map((from, i) => ({ from, to: spineIds[i + 1] }));
    // Distinct association types present, in enum order (for the legend).
    const typesPresent = (Object.keys(TYPE_VAR) as AssociationType[]).filter((t) =>
      assocs.some((a) => a.type === t)
    );

    const hasOff = offCount > 0;
    const width = Math.max(MARGIN_X * 2 + Math.max(spineIds.length - 1, 0) * X_GAP + NODE_W, 520);
    const height = (hasOff ? BOTTOM_Y : TOP_Y) + NODE_H / 2 + 48;

    return { pos, assocs, spineEdges, typesPresent, width, height };
  }, [trails, items, activeTrailId]);

  const { pos, assocs, spineEdges, typesPresent, width, height } = layout;
  const spineColor = colors["--ed-gray"] ?? FALLBACK["--ed-gray"];

  return (
    <div ref={containerRef} className={`flex h-full w-full flex-col overflow-hidden ${preview ? "" : "rounded-2xl bg-popover"}`}>
      <div className={`min-h-0 flex-1 ${preview ? "flex" : "overflow-auto"}`}>
        <svg
          {...(preview
            ? { viewBox: `0 0 ${width} ${height}`, width: "100%", height: "100%", preserveAspectRatio: "xMidYMid meet" as const }
            : { width, height })}
          className={preview ? "block pointer-events-none" : "block"}
        >
          <defs>
            <marker id="arrow-spine" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={spineColor} />
            </marker>
            {(Object.keys(TYPE_VAR) as AssociationType[]).map((type) => (
              <marker key={type} id={`arrow-${type}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={typeColor(type)} />
              </marker>
            ))}
          </defs>

          {/* Spine: trail order, thick grey arrows */}
          {spineEdges.map(({ from, to }) => {
            const s = pos.get(from)!;
            const t = pos.get(to)!;
            return (
              <line
                key={`spine-${from}-${to}`}
                x1={s.x + NODE_W / 2 + 6}
                y1={s.y}
                x2={t.x - NODE_W / 2 - 10}
                y2={t.y}
                stroke={spineColor}
                strokeWidth={4}
                markerEnd="url(#arrow-spine)"
              />
            );
          })}

          {/* Associations: coloured, labelled, directional */}
          {assocs.map(({ from, to, type }, i) => {
            const s = pos.get(from)!;
            const t = pos.get(to)!;
            const color = typeColor(type);
            const label = ASSOCIATION_META[type].label;
            const sameRow = s.y === t.y;
            let d: string;
            let lx: number;
            let ly: number;
            if (sameRow) {
              const x1 = s.x;
              const y1 = s.y - NODE_H / 2 - 2;
              const x2 = t.x;
              const y2 = t.y - NODE_H / 2 - 2;
              const cx = (x1 + x2) / 2;
              const cy = Math.min(y1, y2) - (60 + Math.abs(x2 - x1) * 0.1);
              d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
              lx = cx;
              ly = cy + 14;
            } else {
              const x1 = s.x;
              const y1 = s.y + NODE_H / 2 + 2;
              const x2 = t.x;
              const y2 = t.y - NODE_H / 2 - 2;
              const cx = (x1 + x2) / 2;
              const cy = (y1 + y2) / 2;
              d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
              lx = cx + 12;
              ly = cy;
            }
            return (
              <g key={`assoc-${from}-${to}-${i}`}>
                <path d={d} fill="none" stroke={color} strokeWidth={1.75} markerEnd={`url(#arrow-${type})`} />
                <text x={lx} y={ly} textAnchor="middle" fontSize={11} fill={color} className="font-sans">
                  {label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {[...pos.entries()].map(([id, p]) => {
            const item = items[id];
            if (!item) return null;
            const selected = id === selectedItemId;
            return (
              <g key={id} className="cursor-pointer" onClick={() => onSelectItem(item)}>
                <rect
                  x={p.x - NODE_W / 2}
                  y={p.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={colors["--primary"]}
                  stroke={selected ? colors["--foreground"] : "transparent"}
                  strokeWidth={2.5}
                />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={14}
                  fontWeight={500}
                  fill={colors["--primary-foreground"]}
                  className="font-display"
                >
                  {truncate(item.title)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend: trail spine + one entry per association type present */}
      {!preview && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <svg width="30" height="8" className="shrink-0">
              <line x1="0" y1="4" x2="30" y2="4" stroke={spineColor} strokeWidth={4} />
            </svg>
            orden del trail
          </span>
          {typesPresent.map((type) => (
            <span key={type} className="flex items-center gap-2">
              <svg width="30" height="8" className="shrink-0">
                <line x1="0" y1="4" x2="30" y2="4" stroke={typeColor(type)} strokeWidth={2} />
              </svg>
              {ASSOCIATION_META[type].label}
            </span>
          ))}
          {typesPresent.length === 0 && <span className="italic">no associations yet</span>}
        </div>
      )}
    </div>
  );
}
