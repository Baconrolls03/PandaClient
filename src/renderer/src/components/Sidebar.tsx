import { Compass, Home, Library, Plus, Settings as SettingsIcon, type LucideIcon } from 'lucide-react'
import { useStore, type Route } from '@/lib/store'
import { AccountCard } from './AccountCard'
import { InstanceIcon } from './ui'
import { LOADER_NAMES } from '@/lib/format'

const items: { route: Route; match: Route['name'][]; label: string; icon: LucideIcon }[] = [
  { route: { name: 'home' }, match: ['home'], label: 'Home', icon: Home },
  { route: { name: 'library' }, match: ['library', 'instance'], label: 'Library', icon: Library },
  { route: { name: 'discover', type: 'mod' }, match: ['discover', 'project'], label: 'Discover', icon: Compass },
  { route: { name: 'settings' }, match: ['settings'], label: 'Settings', icon: SettingsIcon }
]

export function Sidebar() {
  const { route, navigate, instances, openModal } = useStore()
  const recent = instances.slice(0, 5)

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-border/60 bg-bg p-4">
      <nav className="flex flex-col gap-1">
        {items.map(({ route: r, match, label, icon: Icon }) => {
          const active = match.includes(route.name)
          return (
            <button
              key={label}
              onClick={() => navigate(r)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active ? 'bg-raised text-text shadow-soft' : 'text-muted hover:bg-surface hover:text-text'
              }`}
            >
              <Icon size={18} className={`transition-colors ${active ? 'text-mint' : 'text-muted group-hover:text-text'}`} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Recent</span>
          <button
            aria-label="New instance"
            title="New instance"
            onClick={() => openModal({ kind: 'create-instance' })}
            className="grid size-6 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-mint"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {recent.length === 0 && <p className="px-3 text-xs text-muted">No instances yet</p>}
          {recent.map((inst) => {
            const active = route.name === 'instance' && route.id === inst.id
            return (
              <button
                key={inst.id}
                onClick={() => navigate({ name: 'instance', id: inst.id })}
                className={`flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors ${active ? 'bg-raised' : 'hover:bg-surface'}`}
              >
                <InstanceIcon url={inst.iconUrl} size={30} className="rounded-lg" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{inst.name}</div>
                  <div className="truncate text-[11px] text-muted">
                    {LOADER_NAMES[inst.loader]} {inst.mcVersion}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <AccountCard />
    </aside>
  )
}
