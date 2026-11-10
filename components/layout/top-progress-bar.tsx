export function TopProgressBar({ label }: { label: string }) {
  return <div role="progressbar" aria-label={label} className="fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden">
    <div className="top-progress-fill h-full bg-primary" />
  </div>;
}
