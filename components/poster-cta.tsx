import React from 'react';

export const PosterCta: React.FC = () => {
  return (
    <div className="bg-(--color-accent) text-(--color-bg)">
      <div className="max-w-[1216px] mx-auto px-[72px] py-[84px]">
        <h3 className="font-extrabold text-[56px] leading-[1.06] tracking-[-0.015em]">
          <span className="block">Find your path.</span>
        </h3>
        <p className="text-[17px] leading-7 max-w-[46ch] mt-5 text-(--color-bg) opacity-85">
          One idea at a time, until it all connects.
        </p>
        <div className="mt-[42px]">
          <a
            href="/signup"
            className="btn btn-ghost text-(--color-bg) border-(--color-bg)"
          >
            Start for free
          </a>
        </div>
      </div>
    </div>
  );
};
