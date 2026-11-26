import { Play } from 'lucide-react'
import type { Instance } from '@shared/types'
import { LOADER_NAMES, timeAgo } from '@/lib/format'
import { useStore } from '@/lib/store'
import { InstanceIcon } from './ui'

export function InstanceCard({ inst }: { inst: Instance }) {
  const { navigate, launch, progress } = useStore()
  const busy = progress.instanceId === inst.id && progress.stage !== 'idle' && progress.stage !== 'error'
  return (
    <div
      onClick={() => navigate({ name: 'instance', id: inst.id })}
      className="group relative cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:bg-raised hover:shadow-lift"
    >
      <div className="relative w-fit">
        <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={64} />
        <button
          aria-label={`Play ${inst.name}`}
          onClick={(e) => {
            e.stopPropagation()
            launch(inst.id)
          }}
          className={`absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full bg-mint text-ink shadow-mint transition-all duration-150 hover:scale-110 ${
            busy ? 'opacity-100' : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          <Play size={15} fill="currentColor" className="ml-0.5" />
        </button>
      </div>
      <h3 className="mt-4 truncate text-sm font-semibold">{inst.name}</h3>
      <p className="mt-0.5 truncate text-xs text-muted">
        {LOADER_NAMES[inst.loader]} {inst.mcVersion}
      </p>
      <p className="mt-2 truncate text-[11px] text-muted/80">{inst.lastPlayed ? `Played ${timeAgo(inst.lastPlayed)}` : 'Never played'}</p>
    </div>
  )
}
