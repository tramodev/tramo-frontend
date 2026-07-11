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
      className="relative hidden flex-col justify-end overflow-hidden p-[72px] lg:flex"
      style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.55 }}>
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
        className="absolute h-9 w-9"
        style={{ top: "38%", left: "50%", transform: "translate(-50%, -50%)", background: "var(--color-bg)" }}
      />
      {NODES.map((node) => (
        <div
          key={node.top + node.left}
          className="absolute box-border"
          style={{
            top: node.top,
            left: node.left,
            width: node.size,
            height: node.size,
            border: "2px solid var(--color-bg)",
          }}
        />
      ))}
      <h2
        className="relative m-0 text-[52px] font-extrabold"
        style={{ lineHeight: 1.06, letterSpacing: "-0.015em", marginLeft: "-0.058em" }}
      >
        <span className="block">{lines[0]}</span>
        <span className="block">{lines[1]}</span>
      </h2>
    </div>
  );
}
