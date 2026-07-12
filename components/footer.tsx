export function Footer() {
  return (
    <footer style={{ borderTop: "2px solid var(--color-divider)" }}>
      <div
        className="max-w-[1216px] mx-auto px-[72px] py-10 text-[13px] flex justify-between gap-4"
        style={{ color: 'var(--color-neutral-700)' }}
      >
        <span>&copy; {new Date().getFullYear()} MyPath Inc. All rights reserved.</span>
        <span className="tabular-nums">mypath.app</span>
      </div>
    </footer>
  );
}
