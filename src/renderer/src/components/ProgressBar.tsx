import type { LaunchProgress } from '@shared/types'

export function ProgressBar({ state }: { state: LaunchProgress }) {
  const active = state.stage !== 'idle' && state.stage !== 'error'
  if (!active && !state.message) return null
  const pct = state.progress == null ? null : Math.round(state.progress * 100)

  return (
    <div className="animate-pop rounded-2xl border border-border bg-surface/80 p-4 shadow-soft backdrop-blur">
      <div className="mb-2.5 flex items-center justify-between text-sm">
        <span className={state.stage === 'error' ? 'text-danger' : active ? 'text-text' : 'text-muted'}>
          {state.message}
        </span>
        {pct != null && active && <span className="tabular-nums text-muted">{pct}%</span>}
      </div>
      {active && (
        <div className="relative h-2 overflow-hidden rounded-full bg-raised">
          {pct == null ? (
            <div className="absolute inset-y-0 w-2/5 animate-indeterminate rounded-full bg-gradient-to-r from-mint/0 via-mint to-mint/0" />
          ) : (
            <div
              className="h-full rounded-full bg-gradient-to-r from-mint-deep to-mint transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      )}
    </div>
  )
}
