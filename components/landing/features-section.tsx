import { FileText, Waypoints, Copy, Share2 } from 'lucide-react';
import { FadeUp } from '@/components/landing/landing-motion';

const STEPS = [
  { Icon: FileText, label: '1 · Write notes', title: 'Start with one idea', description: 'Open a project and start writing. Add a title, more notes and structure when they help.' },
  { Icon: Waypoints, label: '2 · Connect them', title: 'Explain how ideas relate', description: 'Connect notes when a relationship adds context. Keep simple connections or describe prerequisites, examples and contrasting ideas.' },
  { Icon: Copy, label: '3 · Reuse them', title: 'One note, more than one explanation', description: 'A trail is an ordered sequence of notes. Use the same note in different trails, with a transition that fits each explanation.' },
  { Icon: Share2, label: '4 · Share an explanation', title: 'Give readers a place to begin', description: 'Describe your project and publish a readable snapshot. Share its link, then keep working privately until you publish an update.' },
];

export function FeaturesSection() {
  return <section id="product" className="pt-16 pb-[84px]">
    <div className="mb-4 text-sm font-medium text-primary">From a note to a clear explanation</div>
    <h2 className="mb-3.5 max-w-[24ch] font-display text-[40px] font-medium leading-[1.1]">Write once. Explain in different ways.</h2>
    <p className="mb-10 max-w-[60ch] text-[17px] leading-relaxed text-muted-foreground">Keep your notes connected and reusable. Build trails for the things you want to learn or explain.</p>
    <div className="grid gap-4 md:grid-cols-2">{STEPS.map(({ Icon, label, title, description }, index) => <FadeUp key={label} delay={index * 0.08}><div className="h-full rounded-[28px] bg-card p-8"><Icon className="mb-5 h-6 w-6 text-primary" /><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">{label}</p><h3 className="mb-3 font-display text-2xl font-medium">{title}</h3><p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p></div></FadeUp>)}</div>
    <FadeUp className="mt-5 rounded-[28px] border border-border bg-card p-6 sm:p-9">
      <h3 className="font-display text-2xl font-medium">The same Memex note, in two trails</h3>
      <div className="mt-6 grid gap-5 md:grid-cols-2">{[
        { title: 'Bush’s vision', notes: ['Vannevar Bush', 'As We May Think', 'Memex'] },
        { title: 'Thinking in trails', notes: ['Memex', 'Associative trails', 'Sharing a trail'] },
      ].map(trail => <div key={trail.title}><p className="mb-3 text-sm font-medium">{trail.title}</p><ol className="flex flex-wrap items-center gap-2">{trail.notes.map((note, index) => <li key={note} className={`rounded-lg border px-3 py-2 text-sm ${note === 'Memex' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}><span className="mr-2 text-xs">{index + 1}</span>{note}{note === 'Memex' && <span className="mt-1 block text-xs">Same shared note</span>}</li>)}</ol></div>)}</div>
      <p className="mt-5 text-sm text-muted-foreground">Edit Memex once and both trails use the updated note. Each trail keeps its own order and transition explanations. Published snapshots stay unchanged until you publish again.</p>
      <a href="/projects" className="mt-5 inline-block text-sm font-medium text-primary underline">Try the editable example in your workspace</a>
    </FadeUp>
    <p className="mt-6 text-sm text-muted-foreground">You can also explore the graph, discover published projects, follow authors and discuss their work.</p>
  </section>;
}
