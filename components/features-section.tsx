import React from 'react';

const features = [
  {
    n: '01',
    title: 'A graph, not a folder',
    body: "Every note is a node. Link them as you learn and the structure of a subject draws itself — the graph view shows what you know and what you're missing.",
  },
  {
    n: '02',
    title: 'Daily notes, connected',
    body: "Write today's note; reference yesterday's idea. Links carry context forward so nothing you learn sits isolated in a dated file.",
  },
  {
    n: '03',
    title: 'Share when it matters',
    body: 'Publish any node — or your whole graph — at mypath.app/u/you. Readers get the ideas and the connections, not a flat export.',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="product" className="pt-[84px] pb-[70px]">
      <span
        className="block text-[13px] uppercase tracking-[0.08em] tabular-nums mb-3.5"
        style={{ color: 'var(--color-accent-700)' }}
      >
        What MyPath does
      </span>

      {features.map((f, i) => (
        <div
          key={f.n}
          className="grid grid-cols-1 md:grid-cols-[160px_420px_1fr] gap-x-[72px] gap-y-7 items-baseline py-[42px]"
          style={i > 0 ? { borderTop: '2px solid var(--color-divider)' } : undefined}
        >
          <p className="relative font-extrabold text-[15px] tabular-nums">
            <span
              className="hidden min-[1280px]:block absolute -left-6 top-0.5 w-2.5 h-2.5"
              style={{ background: 'var(--color-accent)' }}
            />
            {f.n}
          </p>
          <h2 className="font-extrabold text-2xl tracking-[-0.01em]">{f.title}</h2>
          <p className="text-[15.5px] leading-7 max-w-[52ch]" style={{ color: 'var(--color-neutral-800)' }}>
            {f.body}
          </p>
        </div>
      ))}
    </section>
  );
};
