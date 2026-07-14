interface AuthPosterProps {
  lines: [string, string];
}

const NODES = [
  { top: "16%", left: "22%", size: 14 },
  { top: "22%", left: "80%", size: 12 },
  { top: "58%", left: "74%", size: 16 },
  { top: "52%", left: "26%", size: 12 },
];

export function AuthPoster({ lines }: AuthPosterProps) {
  return (
    <div
      className="relative hidden flex-col justify-end overflow-hidden p-[72px] lg:flex bg-(--color-accent) text-(--color-bg)"
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-55">
        {NODES.map((node) => (
          <line
            key={node.top + node.left}
            x1="50%"
            y1="38%"
            x2={node.left}
            y2={node.top}
            stroke="currentColor"
            strokeWidth={2}
          />
        ))}
      </svg>
      <div
        className="absolute h-9 w-9 top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--color-bg)"
      />
      {NODES.map((node) => (
        <div
          key={node.top + node.left}
          className="absolute box-border border-2 border-(--color-bg)"
          style={{ top: node.top, left: node.left, width: node.size, height: node.size }}
        />
      ))}
      <h2
        className="relative m-0  leading-[1.06] tracking-[-0.015em] ml-[]"
      >
        <span className="block text-[52px] font-extrabold">{lines[0]}</span>
        <span className="block text-[20px] font-medium">{lines[1]}</span>
      </h2>
    </div>
  );
}
