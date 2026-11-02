import type { CSSProperties } from 'react';

type MapNote = { title: string; paragraphs: [string, string]; shared?: boolean };

const TRAILS: { title: string; notes: MapNote[] }[] = [
  {
    title: 'Bush’s vision',
    notes: [
      { title: 'Vannevar Bush', paragraphs: ['Vannevar Bush was an American engineer and science administrator. In 1945, he published As We May Think, an essay about how people might use technology to work with a growing body of knowledge.', 'Rather than only storing more information, his proposal focus...'] },
      { title: 'As We May Think', paragraphs: ['Published in The Atlantic in July 1945, As We May Think asks how tools could help people consult and connect the records they collect. Bush contrasts rigid indexing with the way thought moves by association.', 'His proposed answer includes the Memex: a perso...'] },
      { title: 'Memex', shared: true, paragraphs: ['The Memex was a proposed device for storing and consulting a person’s books, records and communications. Bush imagined a desk with screens and microfilm, rather than a modern computer or the web.', 'Its distinctive idea was associative access: a reader could...'] },
    ],
  },
  {
    title: 'Thinking in trails',
    notes: [
      { title: 'Memex', shared: true, paragraphs: ['The Memex was a proposed device for storing and consulting a person’s books, records and communications. Bush imagined a desk with screens and microfilm, rather than a modern computer or the web.', 'Its distinctive idea was associative access: a reader could...'] },
      { title: 'Associative trails', paragraphs: ['An associative trail is a named path through connected records. In Bush’s proposal, a reader could join records, add comments and return to the path without reconstructing every connection.', 'A record could appear in more than one trail. That lets one sourc...'] },
      { title: 'Sharing a trail', paragraphs: ['Bush imagined readers copying trails for other people to explore and extend in their own Memex. Sharing meant passing along a path through material, not just an isolated document.', 'Try that idea here: edit the shared Memex note and open Bush’s vision. Both...'] },
    ],
  },
];

const u = (n: number) => `calc(${n} * var(--u))`;

function MapCard({ note, index, last }: { note: MapNote; index: number; last: boolean }) {
  return <div className="relative flex flex-col rounded-[length:var(--r)] border border-border bg-card text-card-foreground" style={{ '--r': u(22), padding: `${u(28)} ${u(26)} ${u(26)}` } as CSSProperties}>
    <div className="flex items-baseline justify-between" style={{ marginBottom: u(16) }}>
      <h4 className="font-display font-normal" style={{ fontSize: u(42), lineHeight: 1.19 }}>{note.title}</h4>
      <span className="flex items-baseline font-medium uppercase tracking-wide text-muted-foreground" style={{ fontSize: u(16), gap: u(12) }}>
        {note.shared && <span>Shared</span>}
        <span>{index + 1}</span>
      </span>
    </div>
    {note.paragraphs.map(text => <p key={text} className="[&:not(:first-of-type)]:mt-[var(--gap)]" style={{ fontSize: u(24), lineHeight: 1.583, '--gap': u(19) } as CSSProperties}>{text}</p>)}
    {!last && <svg aria-hidden="true" viewBox="0 0 24 64" fill="none" className="absolute left-1/2 top-full overflow-visible stroke-muted-foreground" style={{ width: u(24), height: u(64), marginTop: u(1) }} strokeWidth="2">
      <path d="M0 0C24 12 24 52 0 64" />
    </svg>}
  </div>;
}

export function ProductMapDemo() {
  return <div role="img" aria-label="Two trails connected through the shared Memex note" className="@container">
    <div
      className="relative bg-background text-foreground [--u:calc(100cqw/1802)]"
      style={{ backgroundImage: 'radial-gradient(color-mix(in oklab, var(--border) 45%, transparent) var(--u), transparent 0)', backgroundSize: `${u(40)} ${u(40)}`, padding: `${u(35)} ${u(53)} ${u(19)} ${u(35)}` }}
    >
      <div className="grid grid-cols-[810fr_811fr] items-start gap-x-[var(--gap-x)]" style={{ '--gap-x': u(93) } as CSSProperties}>
        {TRAILS.map(trail => <section key={trail.title}>
          <h3 className="font-display font-normal" style={{ fontSize: u(32), lineHeight: 1.31, padding: `0 ${u(25)} ${u(33)}` }}>{trail.title}</h3>
          <div className="flex flex-col rounded-[length:var(--r)] border border-border" style={{ '--r': u(24), gap: u(65), padding: `${u(45)} ${u(25)} ${u(38)}` } as CSSProperties}>
            {trail.notes.map((note, index) => <MapCard key={note.title} note={note} index={index} last={index === trail.notes.length - 1} />)}
          </div>
        </section>)}
      </div>
      <svg aria-hidden="true" viewBox="0 0 1802 1332" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-0 size-full">
        <path d="M820 1110H833Q855 1110 855 1088V342Q855 320 877 320H963" stroke="var(--ed-blue)" strokeOpacity=".6" strokeWidth="2" strokeDasharray="5 5" />
      </svg>
    </div>
  </div>;
}
