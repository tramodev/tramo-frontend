import { Waypoints, Copy, Share2, Check, Bold, Italic, Link2, List, Undo2 } from 'lucide-react';
import { FadeUp } from '@/components/landing/landing-motion';

function WriteMockup() {
  return <div className="w-full overflow-hidden rounded-[20px] border border-border bg-background shadow-elevation-2">
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 text-xs">
      <span className="font-medium">Memex and Vannevar Bush</span>
      <span className="flex shrink-0 items-center gap-1 text-primary"><Check className="h-3 w-3" />Saved</span>
    </div>
    <div className="p-3"><div className="overflow-hidden rounded-[14px] bg-popover">
      <div className="flex gap-4 border-b border-border px-4 py-2.5 text-muted-foreground">
        {[Undo2, Bold, Italic, Link2, List].map((Icon, i) => <Icon key={i} className="h-3.5 w-3.5" />)}
      </div>
      <div className="px-5 py-6">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Step 1</p>
        <p className="mb-3 font-display text-2xl font-medium">Vannevar Bush</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">How can we find, connect and revisit the ideas we collect?</p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Start with a note. Give it a title when you’re ready.<span className="ml-1 inline-block h-3.5 w-px bg-primary align-middle" /></p>
      </div>
    </div></div>
  </div>;
}

function ConnectionsMockup() {
  return <div className="w-full rounded-[18px] border border-border bg-popover p-5 shadow-elevation-2">
    <div className="mb-4 flex items-center justify-between"><span className="font-display text-lg font-medium">Connections</span><Waypoints className="h-4 w-4 text-muted-foreground" /></div>
    <p className="mb-4 text-xs text-muted-foreground">Relationships involving “Memex”.</p>
    <div className="rounded-xl border border-border bg-background p-4">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[var(--ed-orange)]">Related</span>
      <p className="text-[13px] font-medium">Memex is related to As We May Think</p>
    </div>
    <div className="mt-3 rounded-xl border border-border bg-background p-4">
      <p className="text-[13px] font-medium">Memex is elaborated on by Associative trails</p>
    </div>
    <div className="mt-4 flex items-center gap-2 text-xs text-primary"><Link2 className="h-3.5 w-3.5" />Connect notes when they add context</div>
  </div>;
}

function ReuseMockup() {
  return <div className="w-full rounded-[18px] border border-border bg-popover p-5 shadow-elevation-2">
    <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"><Copy className="h-3.5 w-3.5" />One note · two trails</div>
    {[
      { title: 'Bush’s vision', notes: ['Vannevar Bush', 'As We May Think', 'Memex'] },
      { title: 'Thinking in trails', notes: ['Memex', 'Associative trails', 'Sharing a trail'] },
    ].map(trail => <div key={trail.title} className="mb-4 last:mb-0">
      <p className="mb-2 font-display text-lg font-medium">{trail.title}</p>
      <ol className="flex flex-col gap-1.5">{trail.notes.map((note, index) => <li key={note} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${note === 'Memex' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>
        <span className="text-[10px]">{index + 1}</span><span className="flex-1">{note}</span>{note === 'Memex' && <Link2 className="h-3 w-3" />}
      </li>)}</ol>
    </div>)}
    <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Used in 2 trails. Edits appear in both.</p>
  </div>;
}

function ReadingMockup() {
  return <div className="w-full rounded-[18px] border border-border bg-popover p-5 shadow-elevation-2">
    <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"><Share2 className="h-3 w-3" />Published snapshot</div>
    <p className="font-display text-2xl font-medium leading-tight">Memex and Vannevar Bush</p>
    <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Explore a personal knowledge library and the trails that connect its ideas.</p>
    <div className="mt-4 rounded-xl border border-primary bg-background p-3">
      <p className="text-sm font-medium">Bush’s vision</p><p className="mt-1 text-xs text-muted-foreground">Vannevar Bush, his essay and the Memex · 3 notes</p>
    </div>
    <div className="mt-2 rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-medium">Thinking in trails</p><p className="mt-1 text-xs text-muted-foreground">Connections, reuse and sharing · 3 notes</p>
    </div>
  </div>;
}

const STEPS = [
  { Mockup: WriteMockup, color: '--ed-blue', label: '1 · Write notes', title: 'Start with one idea', description: 'Open a project and start writing. Add a title, more notes and structure when they help.' },
  { Mockup: ConnectionsMockup, color: '--ed-orange', label: '2 · Connect them', title: 'Explain how ideas relate', description: 'Connect notes when a relationship adds context. Keep simple connections or describe prerequisites, examples and contrasting ideas.' },
  { Mockup: ReuseMockup, color: '--ed-purple', label: '3 · Reuse them', title: 'One note, more than one explanation', description: 'A trail is an ordered sequence of notes. Use the same note in different trails, with a transition that fits each explanation.' },
  { Mockup: ReadingMockup, color: '--ed-green', label: '4 · Share an explanation', title: 'Give readers a place to begin', description: 'Describe your project and publish a readable snapshot. Share its link, then keep working privately until you publish an update.' },
];

export function FeaturesSection() {
  return <section id="product" className="pt-16 pb-[84px]">
    <div className="mb-4 text-sm font-medium text-primary">From a note to a clear explanation</div>
    <h2 className="mb-3.5 max-w-[24ch] font-display text-[40px] font-medium leading-[1.1]">Write once. Explain in different ways.</h2>
    <p className="mb-10 max-w-[60ch] text-[17px] leading-relaxed text-muted-foreground">Keep your notes connected and reusable. Build trails for the things you want to learn or explain.</p>
    <div className="grid gap-4 md:grid-cols-2">
      {STEPS.map(({ Mockup, color, label, title, description }, index) => <FadeUp key={label} delay={index * 0.08} className="h-full">
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-card">
          <div className="p-6 sm:p-9">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: `var(${color})` }}>{label}</div>
            <h3 className="mb-3 font-display text-2xl font-medium">{title}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div aria-hidden="true" className="flex flex-1 items-center p-5 sm:p-9" style={{ background: `var(${color})` }}><Mockup /></div>
        </div>
      </FadeUp>)}
    </div>
  </section>;
}
