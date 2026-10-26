"use client"

export function SkipLink() {
  return <a href="#main-content" className="sr-only z-[100] rounded-md bg-background px-4 py-3 text-primary shadow-elevation-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3" onClick={event => {
    const main = document.querySelector('main');
    const target = main?.querySelector<HTMLElement>('[data-item-id] [contenteditable="true"]') ?? main;
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus();
    target.scrollIntoView({ block: 'nearest' });
  }}>Skip to content</a>;
}
