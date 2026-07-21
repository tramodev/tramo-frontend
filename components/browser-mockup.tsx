import React from 'react';
import {
  Undo,
  Redo,
  ChevronDown,
  ChevronUp,
  Type,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  Plus,
  Check,
  Share2,
  Link2,
  X,
  Share as GraphIcon,
} from 'lucide-react';

const PATHS = [
  {
    title: 'Getting started',
    ideas: [
      { title: 'Why slow down', active: true },
      { title: 'Morning rituals', active: false },
    ],
  },
  {
    title: 'Advanced practices',
    ideas: [{ title: 'Digital minimalism', active: false }],
  },
];

const LINKED_IDEAS = ['Morning rituals', 'Digital minimalism'];
const GRAPH_NODES = [
  { top: '20%', left: '50%' },
  { top: '60%', left: '25%' },
  { top: '65%', left: '75%' },
];

export const BrowserMockup: React.FC = () => {
  return (
    <div className="relative w-full aspect-[16/9] overflow-hidden rounded-[28px] border border-border bg-background shadow-elevation-2 [container-type:inline-size]">
      {/* Below md the middle column (side panels are `hidden md:flex`/`hidden lg:flex`) still doesn't
          fit a phone-width card, so instead of reflowing every row we render this at a fixed desktop-ish
          "design" width and scale the whole thing down to fit — `100cqw` is the outer card's own live
          width (container query unit), so the scale stays fluid across any phone width, no breakpoint steps. */}
      <div
        className="absolute top-1/2 left-1/2 flex h-[383px] w-[680px] flex-col overflow-hidden [transform:translate(-50%,-50%)_scale(calc(100cqw/680px))] md:static md:h-full md:w-full md:[transform:none]"
      >
      <div className="h-12 flex items-center gap-3 px-5 shrink-0 bg-card border-b border-border">
        <span className="font-display font-semibold text-[14px]">
          Tramo<span className="text-primary"> ●</span>
        </span>
        <span className="h-4 w-px bg-border" />
        <span className="text-[13px] font-medium">Intro to slow living</span>
        <div className="flex-1" />
        <span className="text-[11px] hidden md:inline text-muted-foreground">
          142 words · 812 characters
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
          <Share2 className="w-3 h-3" />
          Share
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
          <Check className="w-3 h-3" />
          Saved
        </span>
        <span className="w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center text-[11px] font-medium bg-primary text-primary-foreground">
          A
        </span>
      </div>

      <div className="flex flex-1 min-h-0 gap-3 p-3">
        <div className="w-[184px] hidden md:flex flex-col shrink-0 p-2.5 gap-3 overflow-hidden rounded-2xl bg-card">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              My paths
            </h3>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-3">
            {PATHS.map((path) => (
              <div key={path.title}>
                <div className="flex items-center gap-2 px-2 text-[13px] font-medium">
                  <span className="w-[7px] h-[7px] shrink-0 rounded-full box-border border-[1.5px] border-input" />
                  {path.title}
                </div>
                <ul className="mt-1 flex flex-col gap-0.5 pl-2.5">
                  {path.ideas.map((idea) => (
                    <li
                      key={idea.title}
                      className={`flex items-center gap-2 rounded-full text-[13px] font-medium truncate px-2.5 py-[5px] ${
                        idea.active
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span
                        className={
                          idea.active
                            ? 'w-[7px] h-[7px] shrink-0 rounded-full bg-primary'
                            : 'w-[7px] h-[7px] shrink-0 rounded-full box-border border-[1.5px] border-input'
                        }
                      />
                      {idea.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-popover">
          <div className="flex items-center gap-2.5 px-4 h-10 shrink-0 overflow-hidden border-b border-border text-muted-foreground">
            <Undo className="w-3.5 h-3.5" />
            <Redo className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <span className="flex items-center gap-1 text-[11px] font-medium shrink-0">
              Roboto
              <ChevronDown className="w-3 h-3" />
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-medium shrink-0">
              <ChevronDown className="w-3 h-3" />
              15
              <ChevronUp className="w-3 h-3" />
            </span>
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <span className="flex items-center gap-1 text-[11px] font-medium shrink-0">
              <Type className="w-3.5 h-3.5" />
              Normal
            </span>
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <Bold className="w-3.5 h-3.5" />
            <Italic className="w-3.5 h-3.5" />
            <Underline className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <LinkIcon className="w-3.5 h-3.5" />
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <List className="w-3.5 h-3.5" />
            <ListOrdered className="w-3.5 h-3.5" />
            <Quote className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <AlignLeft className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 overflow-hidden p-6">
            <h1 className="font-display font-medium text-xl mb-2.5">
              Why slow down
            </h1>
            <p className="text-[13px] leading-6 mb-3 text-muted-foreground">
              Slow living isn&apos;t about doing less — it&apos;s about giving each thing the attention
              it deserves. This idea links to{' '}
              <span className="text-primary font-medium">
                Morning rituals
              </span>{' '}
              and{' '}
              <span className="text-primary font-medium">
                Digital minimalism
              </span>
              .
            </p>
            <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
              <li>— Notice when you&apos;re rushing out of habit, not necessity</li>
              <li>— Pick one ritual to protect every morning</li>
              <li>— Let unfinished things stay unfinished sometimes</li>
            </ul>
          </div>
        </div>

        <div className="w-[204px] hidden lg:flex flex-col shrink-0 p-4 gap-2 overflow-hidden rounded-2xl bg-card">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              Linked ideas
            </h3>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1.5">
            {LINKED_IDEAS.map((title) => (
              <div
                key={title}
                className="flex items-center gap-1.5 min-w-0 rounded-sm border border-border bg-popover py-[7px] px-2.5"
              >
                <Link2 className="w-3 h-3 shrink-0 text-primary" />
                <span className="truncate text-[12px] font-medium flex-1">{title}</span>
                <X className="w-2.5 h-2.5 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>

          <h3 className="mt-2.5 text-[11px] font-medium text-muted-foreground">
            In paths
          </h3>
          <span className="self-start rounded-sm bg-surface-container-highest px-3 py-1 text-[11px] font-medium">
            Getting started
          </span>

          <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              Graph preview
            </h3>
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
              <GraphIcon className="w-3 h-3" />
              Open
            </span>
          </div>
          <div className="relative flex-1 rounded-xl bg-popover min-h-[90px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {GRAPH_NODES.map((node) => (
                <line
                  key={node.top}
                  x1="50%"
                  y1="50%"
                  x2={node.left}
                  y2={node.top}
                  stroke="var(--input)"
                  strokeWidth={1}
                />
              ))}
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
            {GRAPH_NODES.map((node) => (
              <div
                key={node.top}
                className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full box-border bg-popover border-[1.5px] border-input"
                style={{ top: node.top, left: node.left }}
              />
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
