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
    <div
      className="w-full aspect-[16/9] flex flex-col overflow-hidden"
      style={{ border: '2px solid var(--color-text)', background: 'var(--color-bg)' }}
    >
      <div
        className="h-11 flex items-center gap-3 px-5 shrink-0"
        style={{ borderBottom: '2px solid var(--color-divider)' }}
      >
        <span className="font-extrabold text-[13px] tracking-[-0.01em]">
          MyPath<span style={{ color: 'var(--color-accent)' }}>.</span>
        </span>
        <span className="h-[14px] w-px" style={{ background: 'var(--color-divider)' }} />
        <span className="text-[13px] font-bold">Intro to slow living</span>
        <div className="flex-1" />
        <span className="text-[11px] hidden md:inline" style={{ color: 'var(--color-neutral-600)' }}>
          142 words · 812 characters
        </span>
        <span
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: 'var(--color-neutral-700)' }}
        >
          <Share2 className="w-3 h-3" />
          Share
        </span>
        <span
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: 'var(--color-accent)' }}
        >
          <Check className="w-3 h-3" />
          Saved
        </span>
        <span
          className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-extrabold"
          style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}
        >
          A
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div
          className="w-[176px] hidden md:flex flex-col shrink-0 p-4 gap-3 overflow-hidden"
          style={{ borderRight: '2px solid var(--color-divider)' }}
        >
          <div className="flex items-center justify-between">
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--color-neutral-600)' }}
            >
              My paths
            </h3>
            <Plus className="w-3 h-3" style={{ color: 'var(--color-neutral-600)' }} />
          </div>
          <div className="flex flex-col gap-3">
            {PATHS.map((path) => (
              <div key={path.title}>
                <div
                  className="flex items-center gap-2 text-[13px] font-semibold"
                  style={{ color: 'var(--color-neutral-800)' }}
                >
                  <span
                    className="w-1.5 h-1.5 shrink-0 box-border"
                    style={{ border: '1.5px solid var(--color-neutral-600)' }}
                  />
                  {path.title}
                </div>
                <ul className="mt-1 flex flex-col gap-1 pl-3.5">
                  {path.ideas.map((idea) => (
                    <li
                      key={idea.title}
                      className="flex items-center gap-2 text-[13px] truncate -ml-1.5 px-1.5 py-0.5"
                      style={
                        idea.active
                          ? {
                              background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                              color: 'var(--color-accent-600)',
                            }
                          : { color: 'var(--color-neutral-700)' }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 shrink-0 box-border"
                        style={
                          idea.active
                            ? { background: 'var(--color-accent)' }
                            : { border: '1.5px solid var(--color-neutral-600)' }
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

        <div className="flex-1 flex flex-col min-w-0">
          <div
            className="flex items-center gap-2.5 px-4 h-9 shrink-0 overflow-hidden"
            style={{ borderBottom: '2px solid var(--color-divider)', color: 'var(--color-neutral-700)' }}
          >
            <Undo className="w-3.5 h-3.5" />
            <Redo className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-divider)' }} />
            <span className="flex items-center gap-1 text-[11px] font-semibold shrink-0">
              Georgia
              <ChevronDown className="w-3 h-3" />
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-semibold shrink-0">
              <ChevronDown className="w-3 h-3" />
              15
              <ChevronUp className="w-3 h-3" />
            </span>
            <span className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-divider)' }} />
            <span className="flex items-center gap-1 text-[11px] font-semibold shrink-0">
              <Type className="w-3.5 h-3.5" />
              Normal
            </span>
            <span className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-divider)' }} />
            <Bold className="w-3.5 h-3.5" />
            <Italic className="w-3.5 h-3.5" />
            <Underline className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-divider)' }} />
            <LinkIcon className="w-3.5 h-3.5" />
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-divider)' }} />
            <List className="w-3.5 h-3.5" />
            <ListOrdered className="w-3.5 h-3.5" />
            <Quote className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-divider)' }} />
            <AlignLeft className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 overflow-hidden p-6">
            <h1 className="font-extrabold text-xl mb-2.5" style={{ letterSpacing: '-0.01em' }}>
              Why slow down
            </h1>
            <p className="text-[13px] leading-6 mb-3" style={{ color: 'var(--color-neutral-800)' }}>
              Slow living isn&apos;t about doing less — it&apos;s about giving each thing the attention
              it deserves. This idea links to{' '}
              <span style={{ color: 'var(--color-accent-600)', textDecoration: 'underline', fontWeight: 600 }}>
                Morning rituals
              </span>{' '}
              and{' '}
              <span style={{ color: 'var(--color-accent-600)', textDecoration: 'underline', fontWeight: 600 }}>
                Digital minimalism
              </span>
              .
            </p>
            <ul className="flex flex-col gap-1.5 text-[13px]" style={{ color: 'var(--color-neutral-800)' }}>
              <li>— Notice when you&apos;re rushing out of habit, not necessity</li>
              <li>— Pick one ritual to protect every morning</li>
              <li>— Let unfinished things stay unfinished sometimes</li>
            </ul>
          </div>
        </div>

        <div
          className="w-[200px] hidden lg:flex flex-col shrink-0 p-4 gap-2 overflow-hidden"
          style={{ borderLeft: '2px solid var(--color-divider)' }}
        >
          <div className="flex items-center justify-between">
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--color-neutral-600)' }}
            >
              Linked ideas
            </h3>
            <Plus className="w-3 h-3" style={{ color: 'var(--color-neutral-600)' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            {LINKED_IDEAS.map((title) => (
              <div
                key={title}
                className="flex items-center gap-1.5 min-w-0"
                style={{ border: '2px solid var(--color-divider)', padding: '7px 8px' }}
              >
                <Link2 className="w-3 h-3 shrink-0" style={{ color: 'var(--color-accent)' }} />
                <span className="truncate text-[12px] font-semibold flex-1">{title}</span>
                <X className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--color-neutral-600)' }} />
              </div>
            ))}
          </div>

          <h3
            className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--color-neutral-600)' }}
          >
            In paths
          </h3>
          <span
            className="self-start text-[11px] font-semibold"
            style={{ background: 'var(--color-neutral-300)', padding: '4px 10px' }}
          >
            Getting started
          </span>

          <div className="mt-2.5 flex items-center justify-between" style={{ borderTop: '2px solid var(--color-divider)', paddingTop: 10 }}>
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--color-neutral-600)' }}
            >
              Graph preview
            </h3>
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--color-accent-600)' }}>
              <GraphIcon className="w-3 h-3" />
              Open
            </span>
          </div>
          <div className="relative flex-1" style={{ border: '2px solid var(--color-divider)', minHeight: 90 }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {GRAPH_NODES.map((node) => (
                <line
                  key={node.top}
                  x1="50%"
                  y1="50%"
                  x2={node.left}
                  y2={node.top}
                  stroke="var(--color-neutral-500)"
                  strokeWidth={1}
                />
              ))}
            </svg>
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5"
              style={{ background: 'var(--color-accent)' }}
            />
            {GRAPH_NODES.map((node) => (
              <div
                key={node.top}
                className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 box-border"
                style={{ top: node.top, left: node.left, background: 'var(--color-bg)', border: '1.5px solid var(--color-neutral-600)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
