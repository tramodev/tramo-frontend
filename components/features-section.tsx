import React from 'react';

const features = [
  {
    n: '01',
    title: 'Ideas, linked as you write',
    body: "Every idea lives inside a path. Type @ to link it to any other idea in your project — the connections stay live wherever you're reading, no manual outlining required.",
    chip: 'bg-accent text-accent-foreground',
    radius: 'rounded-t-[28px] rounded-b-[4px]',
  },
  {
    n: '02',
    title: "Private until you're ready",
    body: 'Write and edit freely in private. When a path is ready, publish it with one click — it gets its own shareable link and shows up on Explore for others to find.',
    chip: 'bg-secondary text-secondary-foreground',
    radius: 'rounded-[4px]',
  },
  {
    n: '03',
    title: 'Built to be found and built on',
    body: "Published paths can be upvoted, bookmarked, or forked into someone else's account. Earn badges as your work gets attention, and follow the authors whose paths you keep coming back to.",
    chip: 'bg-tertiary text-tertiary-foreground',
    radius: 'rounded-t-[4px] rounded-b-[28px]',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="product" className="pt-16 pb-[84px]">
      <span className="block text-sm font-medium mb-5 text-primary">
        What Tramo does
      </span>

      {features.map((f) => (
        <div
          key={f.n}
          className={`grid grid-cols-1 md:grid-cols-[80px_minmax(200px,380px)_1fr] gap-x-10 gap-y-2 items-start p-9 mb-2 bg-card ${f.radius}`}
        >
          <span
            className={`flex items-center justify-center h-12 w-12 rounded-full text-base font-medium ${f.chip}`}
          >
            {f.n}
          </span>
          <h2 className="font-display font-medium text-2xl mt-2">{f.title}</h2>
          <p className="text-[15.5px] leading-[1.65] max-w-[52ch] mt-2 text-muted-foreground">
            {f.body}
          </p>
        </div>
      ))}
    </section>
  );
};
