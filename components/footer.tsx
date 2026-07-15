export function Footer() {
  return (
    <footer className="border-t border-(--color-divider)">
      <div
        className="max-w-[1216px] mx-auto px-[72px] py-10 text-[13px] flex justify-between gap-4 text-(--color-neutral-700)"
      >
        <span>&copy; {new Date().getFullYear()} MyPath Inc. All rights reserved.</span>
        <span className="tabular-nums">mypath.app</span>
      </div>
    </footer>
  );
}
