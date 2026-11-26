import { Loader2, Play, Square } from 'lucide-react'
import { useStore } from '@/lib/store'

/** Play / Launching / Stop for one instance. */
export function PlayButton({ instanceId, disabled, size = 'lg' }: { instanceId: string | null; disabled?: boolean; size?: 'md' | 'lg' }) {
  const { launch, stop, running, progress } = useStore()
  const isRunning = Boolean(instanceId && running.has(instanceId))
  const busy = !isRunning && progress.instanceId === instanceId && progress.stage !== 'idle' && progress.stage !== 'error' && progress.stage !== 'running'
  const dims = size === 'lg' ? 'h-14 min-w-48 px-9 text-lg' : 'h-11 min-w-32 px-6 text-base'

  if (isRunning)
    return (
      <button
        onClick={() => instanceId && stop(instanceId)}
        className={`group flex items-center justify-center gap-2.5 rounded-2xl bg-danger font-bold tracking-tight text-white shadow-[0_12px_36px_-10px_rgb(242_109_109/0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 ${dims}`}
      >
        <Square size={18} fill="currentColor" /> Stop
      </button>
    )

  return (
    <button
      onClick={() => instanceId && launch(instanceId)}
      disabled={busy || disabled || !instanceId}
      className={`group relative flex items-center justify-center gap-2.5 rounded-2xl bg-mint font-bold tracking-tight text-ink shadow-mint transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-mint-strong active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-default disabled:opacity-70 disabled:shadow-none ${dims}`}
    >
      {busy ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" className="transition-transform duration-200 group-hover:scale-110" />}
      {busy ? 'Launching' : 'Play'}
    </button>
  )
}
