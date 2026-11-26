import { Sparkles } from 'lucide-react'

const entries = [
  {
    version: '0.1.0',
    date: 'Nov 2026',
    title: 'Hello, PandaClient',
    items: ['New launcher shell with a custom title bar', 'Pick any Minecraft release, or snapshots', 'Settings for RAM, Java and game folder']
  },
  {
    version: 'Next',
    date: 'Soon',
    title: 'Coming up',
    items: ['Microsoft sign-in', 'One-click Fabric + Sodium, Lithium, Iris', 'Download progress and game launch']
  }
]

export function NewsCard() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-blue" />
        <h2 className="text-sm font-semibold">What's new</h2>
      </header>
      <div className="flex flex-col gap-3">
        {entries.map((e) => (
          <article
            key={e.version}
            className="rounded-xl border border-transparent bg-bg/60 p-4 transition-all duration-150 hover:-translate-y-px hover:border-border hover:bg-raised"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded-md bg-blue/15 px-1.5 py-0.5 text-[11px] font-semibold text-blue">{e.version}</span>
              <span className="text-xs text-muted">{e.date}</span>
            </div>
            <h3 className="mb-2 text-sm font-semibold">{e.title}</h3>
            <ul className="space-y-1 text-[13px] text-muted">
              {e.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-mint" />
                  {i}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
