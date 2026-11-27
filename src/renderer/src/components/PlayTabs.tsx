import { BarChart3, Gamepad2, Globe } from 'lucide-react'
import { useStore } from '@/lib/store'

const TABS = [
  { name: 'home', label: 'Play', icon: Gamepad2 },
  { name: 'servers', label: 'Servers', icon: Globe },
  { name: 'stats', label: 'Stats', icon: BarChart3 }
] as const

/** Play, Servers and Stats live together under "Play" in the sidebar. */
export function PlayTabs({ active }: { active: 'home' | 'servers' | 'stats' }) {
  const { navigate } = useStore()
  return (
    <div className="mx-auto flex max-w-6xl gap-1 px-8 pt-6">
      {TABS.map(({ name, label, icon: Icon }) => (
        <button
          key={name}
          onClick={() => navigate({ name })}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${active === name ? 'bg-raised text-text' : 'text-muted hover:bg-surface hover:text-text'}`}
        >
          <Icon size={15} className={active === name ? 'text-mint' : ''} />
          {label}
        </button>
      ))}
    </div>
  )
}
