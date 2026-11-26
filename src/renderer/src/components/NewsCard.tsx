import { Sparkles } from 'lucide-react'

const entries = [
  {
    version: '0.2.0',
    date: 'Nov 2026',
    title: 'Library & Discover',
    items: [
      'Instances for Vanilla, Fabric, Quilt, Forge and NeoForge',
      'Browse and install mods, modpacks, resource packs, shaders and data packs from Modrinth',
      'Content, Worlds, Screenshots, Files and Logs for every instance',
      'Update checks, .mrpack import & export'
    ]
  },
  {
    version: '0.1.0',
    date: 'Nov 2026',
    title: 'Hello, PandaClient',
    items: ['Custom title bar and dark theme', 'Pick any Minecraft release, or snapshots', 'Settings for RAM, Java and game folder']
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
          <article key={e.version} className="rounded-xl border border-transparent bg-bg/60 p-4 transition-all duration-150 hover:-translate-y-px hover:border-border hover:bg-raised">
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
