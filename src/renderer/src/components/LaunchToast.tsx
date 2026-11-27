import { useEffect, useState } from 'react'
import { Gamepad2, Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'

/** "Launching …" card in the top corner while a game starts (replaces the old bottom bar). */
export function LaunchToast() {
  const { progress, instances } = useStore()
  const [hideAt, setHideAt] = useState(0)
  const [, tick] = useState(0)
  const active = progress.stage !== 'idle' && progress.stage !== 'error'
  useEffect(() => {
    if (progress.stage === 'running') {
      setHideAt(Date.now() + 3500)
      const t = setTimeout(() => tick((n) => n + 1), 3600)
      return () => clearTimeout(t)
    }
    setHideAt(0)
  }, [progress.stage])
  if (!active || (progress.stage === 'running' && hideAt && Date.now() > hideAt)) return null
  const inst = instances.find((i) => i.id === progress.instanceId)
  const running = progress.stage === 'running'
  return (
    <div className="pointer-events-none fixed right-4 top-[68px] z-40 w-80 animate-pop rounded-2xl border border-border bg-surface/95 p-3.5 shadow-lift backdrop-blur">
      <div className="flex items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${running ? 'bg-mint/15 text-mint' : 'bg-blue/15 text-blue'}`}>
          {running ? <Gamepad2 size={17} /> : <Loader2 size={17} className="animate-spin" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{running ? `${inst?.name ?? 'Minecraft'} is running` : `Launching ${inst?.name ?? 'Minecraft'}`}</div>
          <div className="truncate text-xs text-muted">{progress.message || 'Getting ready…'}</div>
        </div>
      </div>
      {!running && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-raised">
          {progress.progress != null ? (
            <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
          ) : (
            <div className="h-full w-1/3 animate-indeterminate rounded-full bg-blue" />
          )}
        </div>
      )}
    </div>
  )
}
