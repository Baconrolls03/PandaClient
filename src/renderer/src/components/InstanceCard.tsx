import { AlertTriangle, Play } from 'lucide-react'
import type { Instance } from '@shared/types'
import { PANDA_VERSIONS } from '@shared/bundles'
import { LOADER_NAMES, playtime, timeAgo } from '@/lib/format'
import { artFor } from '@/lib/lobbyArt'
import { useStore } from '@/lib/store'
import { InstanceIcon } from './ui'

/** A profile in the library: a picture card with its icon, name, version and a Play button. */
export function InstanceCard({ inst }: { inst: Instance }) {
  const { navigate, launch, progress, settings, running } = useStore()
  const busy = progress.instanceId === inst.id && progress.stage !== 'idle' && progress.stage !== 'error'
  const playing = running.has(inst.id)
  const supported = PANDA_VERSIONS.includes(inst.mcVersion)
  return (
    <div
      onClick={() => navigate({ name: 'instance', id: inst.id })}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-white/25 hover:shadow-lift"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={artFor(inst.id)} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
        {playing && <span className="absolute left-3 top-3 rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">Playing</span>}
        {!supported && (
          <span title="PandaClient runs on Minecraft 1.21.6 to 1.21.11" className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur">
            <AlertTriangle size={10} /> No PandaClient
          </span>
        )}
        <button
          aria-label={`Play ${inst.name}`}
          onClick={(e) => {
            e.stopPropagation()
            launch(inst.id)
          }}
          className={`absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-mint text-ink shadow-mint transition-all duration-150 hover:scale-110 ${
            busy ? 'opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          <Play size={18} fill="currentColor" className="ml-0.5" />
        </button>
      </div>
      <div className="relative -mt-7 flex items-end gap-3 px-4 pb-4">
        <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={52} className="shrink-0 rounded-xl ring-4 ring-surface" />
        <div className="min-w-0 pb-0.5">
          <h3 className="truncate text-[15px] font-bold leading-tight">{inst.name}</h3>
          <p className="truncate text-xs text-muted">
            {LOADER_NAMES[inst.loader]} {inst.mcVersion}
            {' · '}
            {inst.lastPlayed ? `Played ${timeAgo(inst.lastPlayed)}` : 'Never played'}
            {settings.showPlayTime && inst.playtimeSec > 0 && ` · ${playtime(inst.playtimeSec)}`}
          </p>
        </div>
      </div>
    </div>
  )
}
