import React from 'react';

export const Hero: React.FC = () => {
  return (
    <div className="pt-24 text-center">
      <h1
        className="font-extrabold leading-[1.06] tracking-[-0.02em]"
        style={{ fontSize: 'clamp(42px, 6.2vw, 76px)' }}
      >
        <span className="block">Organize learning as interconnected ideas,</span>
        <span className="block" style={{ color: 'var(--color-accent)' }}>
          not isolated notes.
        </span>
      </h1>
      <p
        className="text-[17px] leading-7 max-w-[58ch] mx-auto mt-9"
        style={{ color: 'var(--color-neutral-800)' }}
      >
        — and share them when it matters.
      </p>
      <div className="flex gap-3 flex-wrap justify-center mt-7">
        <a href="/signup" className="btn btn-primary">
          Start for free
        </a>
        <a href="#product" className="btn btn-ghost">
          See how it works
        </a>
      </div>
    </div>
  );
};
