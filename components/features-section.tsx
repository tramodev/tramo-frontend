import React from 'react';

const features = [
  {
    n: '01',
    title: 'Ideas, linked as you write',
    body: "Every idea lives inside a path. Type @ to link it to any other idea in your project — the connections stay live wherever you're reading, no manual outlining required.",
  },
  {
    n: '02',
    title: "Private until you're ready",
    body: 'Write and edit freely in private. When a path is ready, publish it with one click — it gets its own shareable link and shows up on Explore for others to find.',
  },
  {
    n: '03',
    title: 'Built to be found and built on',
    body: "Published paths can be upvoted, bookmarked, or forked into someone else's account. Earn badges as your work gets attention, and follow the authors whose paths you keep coming back to.",
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="product" className="pt-[84px] pb-[70px]">
      <span
        className="block text-[13px] uppercase tracking-[0.08em] tabular-nums mb-3.5 text-(--color-accent-700)"
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
              className="hidden min-[1280px]:block absolute -left-6 top-0.5 w-2.5 h-2.5 bg-(--color-accent)"
            />
            {f.n}
          </p>
          <h2 className="font-extrabold text-2xl tracking-[-0.01em]">{f.title}</h2>
          <p className="text-[15.5px] leading-7 max-w-[52ch] text-(--color-neutral-800)">
            {f.body}
          </p>
        </div>
      ))}
    </section>
  );
};
