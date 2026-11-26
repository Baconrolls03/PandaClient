import { Boxes } from 'lucide-react'

export const CURATED_MODS = [
  { slug: 'fabric-api', name: 'Fabric API', desc: 'Core library most Fabric mods need' },
  { slug: 'sodium', name: 'Sodium', desc: 'Modern renderer, big FPS boost' },
  { slug: 'lithium', name: 'Lithium', desc: 'Faster game logic and ticking' },
  { slug: 'iris', name: 'Iris', desc: 'Shader pack support' }
]

export function ModsCard({ fabric }: { fabric: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <header className="mb-4 flex items-center gap-2">
        <Boxes size={16} className="text-mint" />
        <h2 className="text-sm font-semibold">Included mods</h2>
        <span className="ml-auto text-xs text-muted">{fabric ? 'from Modrinth' : 'needs Fabric'}</span>
      </header>
      <ul className="flex flex-col gap-1">
        {CURATED_MODS.map((m) => (
          <li
            key={m.slug}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-raised ${fabric ? '' : 'opacity-50'}`}
          >
            <div className="grid size-8 place-items-center rounded-lg bg-raised text-xs font-bold text-mint">
              {m.name[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{m.name}</div>
              <div className="truncate text-xs text-muted">{m.desc}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
