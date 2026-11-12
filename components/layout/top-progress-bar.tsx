"use client"
import { useLayoutEffect, useRef } from "react";

export function TopProgressBar({ label }: { label: string }) {
  const fillRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fill = fillRef.current!;
    return () => {
      const from = getComputedStyle(fill).transform;
      const bar = fill.parentElement!;
      requestAnimationFrame(() => {
        if (fill.isConnected) return;
        const ghost = bar.cloneNode(true) as HTMLElement;
        const ghostFill = ghost.firstElementChild as HTMLElement;
        ghost.removeAttribute("role");
        ghost.setAttribute("aria-hidden", "true");
        ghostFill.style.animation = "none";
        document.body.append(ghost);
        ghostFill.animate([{ transform: from }, { transform: "scaleX(1)" }], { duration: 200, easing: "ease-out", fill: "forwards" });
        ghost.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 200, duration: 200, fill: "forwards" }).finished.then(() => ghost.remove());
      });
    };
  }, []);

  return <div role="progressbar" aria-label={label} className="fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden">
    <div ref={fillRef} className="top-progress-fill h-full bg-primary" />
  </div>;
}
