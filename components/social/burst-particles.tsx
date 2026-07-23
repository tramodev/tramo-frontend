const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

export function BurstParticles() {
  return (
    <>
      {BURST_ANGLES.map((angle) => (
        <span
          key={angle}
          className="burst-particle absolute top-1/2 left-1/2 size-1 rounded-full bg-current"
          style={{ "--burst-angle": `${angle}deg` } as React.CSSProperties}
        />
      ))}
    </>
  )
}
