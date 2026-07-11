import React from 'react';

export const PosterCta: React.FC = () => {
  return (
    <div style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}>
      <div className="max-w-[1216px] mx-auto px-[72px] py-[84px]">
        <h3 className="font-extrabold text-[56px] leading-[1.06] tracking-[-0.015em]">
          <span className="block">Connect the dots.</span>
        </h3>
        <div className="mt-[42px]">
          <a
            href="/signup"
            className="btn btn-ghost"
            style={{ color: 'var(--color-bg)', borderColor: 'var(--color-bg)' }}
          >
            Start for free
          </a>
        </div>
      </div>
    </div>
  );
};
