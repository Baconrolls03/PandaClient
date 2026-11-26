import { Home, Package, Settings as SettingsIcon, type LucideIcon } from 'lucide-react'
import { AccountCard } from './AccountCard'

export type Page = 'home' | 'mods' | 'settings'

const items: { id: Page; label: string; icon: LucideIcon; soon?: boolean }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'mods', label: 'Mods', icon: Package, soon: true },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
]

export function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-2 border-r border-border/60 bg-bg p-4">
      <nav className="flex flex-col gap-1">
        {items.map(({ id, label, icon: Icon, soon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active ? 'bg-raised text-text shadow-soft' : 'text-muted hover:bg-surface hover:text-text'
              }`}
            >
              <Icon
                size={18}
                className={`transition-colors ${active ? 'text-mint' : 'text-muted group-hover:text-text'}`}
              />
              {label}
              {soon && (
                <span className="ml-auto rounded-md bg-blue/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue">
                  Soon
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto">
        <AccountCard />
      </div>
    </aside>
  )
}
