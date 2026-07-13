import React from 'react';
import { Search, Plus, Minus } from 'lucide-react';

export const BrowserMockup: React.FC = () => {
  return (
    <div
      className="w-full aspect-[16/10] flex overflow-hidden"
      style={{ border: '2px solid var(--color-text)', background: 'var(--color-bg)' }}
    >
      <div
        className="w-[264px] hidden md:flex flex-col shrink-0"
        style={{ borderRight: '2px solid var(--color-divider)' }}
      >
        <div
          className="h-14 flex items-center px-5 gap-2.5"
          style={{ borderBottom: '2px solid var(--color-divider)' }}
        >
          <span className="w-2.5 h-2.5 shrink-0" style={{ background: 'var(--color-accent)' }} />
          <span className="font-extrabold text-[15px] tracking-[-0.01em]">Alex&apos;s Brain</span>
        </div>

        <div className="flex-1 p-5 flex flex-col gap-7">
          <div
            className="flex items-center gap-2 px-2.5 py-2 text-[13px]"
            style={{ border: '1px solid var(--color-neutral-400)', color: 'var(--color-neutral-600)' }}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <span className="ml-auto text-[11px] tabular-nums">⌘K</span>
          </div>

          <div>
            <h3
              className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3"
              style={{ color: 'var(--color-neutral-600)' }}
            >
              Favorites
            </h3>
            <ul className="flex flex-col gap-1">
              <li
                className="flex items-center gap-2.5 py-1.5 text-sm font-semibold cursor-pointer"
                style={{ color: 'var(--color-accent-700)' }}
              >
                <span className="w-2 h-2 shrink-0" style={{ background: 'var(--color-accent)' }} />
                Graph view
              </li>
              <li
                className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer hover:text-[var(--color-accent-600)]"
                style={{ color: 'var(--color-neutral-800)' }}
              >
                <span
                  className="w-2 h-2 shrink-0 box-border"
                  style={{ border: '1.5px solid var(--color-neutral-600)' }}
                />
                Daily notes
              </li>
            </ul>
          </div>

          <div>
            <h3
              className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3"
              style={{ color: 'var(--color-neutral-600)' }}
            >
              Recent nodes
            </h3>
            <ul className="flex flex-col gap-1">
              {['System design', 'React 19 hooks', 'Medieval history'].map((label, i) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer hover:text-[var(--color-accent-600)]"
                  style={{ color: 'var(--color-neutral-800)' }}
                >
                  <span className="text-xs tabular-nums" style={{ color: 'var(--color-neutral-600)' }}>
                    0{i + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4" style={{ borderTop: '2px solid var(--color-divider)' }}>
          <button type="button" className="btn btn-secondary w-full justify-start">
            New node
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div
          className="h-14 flex items-center px-5 gap-4"
          style={{ borderBottom: '2px solid var(--color-divider)' }}
        >
          <span className="text-[13px] tabular-nums" style={{ color: 'var(--color-neutral-700)' }}>
            mypath.app / u / alex / <strong style={{ color: 'var(--color-text)' }}>graph</strong>
          </span>
          <div className="flex-1" />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--color-neutral-600)' }}
          >
            Share
          </span>
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--color-neutral-600)' }}
          >
            More
          </span>
        </div>

        <div
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(var(--color-neutral-300) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="50%" y1="50%" x2="30%" y2="30%" stroke="var(--color-text)" strokeWidth={2} />
            <line x1="50%" y1="50%" x2="70%" y2="60%" stroke="var(--color-text)" strokeWidth={2} />
            <line x1="50%" y1="50%" x2="60%" y2="20%" stroke="var(--color-text)" strokeWidth={2} />
            <line
              x1="70%"
              y1="60%"
              x2="60%"
              y2="20%"
              stroke="var(--color-neutral-500)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <line x1="50%" y1="50%" x2="40%" y2="75%" stroke="var(--color-text)" strokeWidth={2} />
          </svg>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
            <div className="w-12 h-12" style={{ background: 'var(--color-accent)' }} />
            <span
              className="mt-2.5 text-xs font-bold uppercase tracking-[0.08em] px-2 py-[3px]"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-text)' }}
            >
              Knowledge graph
            </span>
          </div>

          {[
            { top: '30%', left: '30%', size: 14, border: 'var(--color-text)', label: 'System design' },
            { top: '60%', left: '70%', size: 20, border: 'var(--color-text)', label: 'Medieval history' },
            { top: '20%', left: '60%', size: 11, border: 'var(--color-neutral-600)', label: 'React 19 hooks' },
            { top: '75%', left: '40%', size: 17, border: 'var(--color-neutral-600)', label: 'Daily notes' },
          ].map((node) => (
            <div
              key={node.label}
              className="absolute flex flex-col items-center z-10"
              style={{ top: node.top, left: node.left }}
            >
              <div
                className="box-border"
                style={{
                  width: node.size,
                  height: node.size,
                  background: 'var(--color-bg)',
                  border: `2px solid ${node.border}`,
                }}
              />
              <span
                className="mt-2 text-[11px] px-[5px] py-[1px]"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-neutral-400)',
                  color: 'var(--color-neutral-800)',
                }}
              >
                {node.label}
              </span>
            </div>
          ))}

          <div className="absolute bottom-5 right-5 flex" style={{ border: '2px solid var(--color-text)' }}>
            <div
              className="w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-[var(--color-neutral-200)]"
              style={{ background: 'var(--color-bg)' }}
            >
              <Plus className="w-4 h-4" />
            </div>
            <div
              className="w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-[var(--color-neutral-200)]"
              style={{ background: 'var(--color-bg)', borderLeft: '2px solid var(--color-text)' }}
            >
              <Minus className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
