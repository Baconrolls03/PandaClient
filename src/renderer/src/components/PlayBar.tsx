import { useEffect, useRef, useState } from 'react'
import { Check, ChevronUp, Download, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { LOADER_NAMES, timeAgo } from '@/lib/format'
import { InstanceIcon } from './ui'
import { PlayButton } from './PlayButton'
import { TasksPanel } from './TasksPanel'

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [open, close])
  return ref
}

/** Feather-style bar pinned to the bottom of every page: instance, activity, Play. */
export function PlayBar() {
  const { selected, instances, update, launch, progress, tasks, openModal, navigate } = useStore()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const pickerRef = useOutside(pickerOpen, () => setPickerOpen(false))
  const tasksRef = useOutside(tasksOpen, () => setTasksOpen(false))

  const launching = progress.stage !== 'idle' && progress.stage !== 'error'
  const running = tasks.filter((t) => t.status === 'running')
  const pct = launching ? progress.progress : running.length ? running.reduce((s, t) => s + (t.progress ?? 0), 0) / running.length : null

  return (
    <div className="relative z-20 flex h-[84px] shrink-0 items-center gap-5 border-t border-border/60 bg-bg/90 px-6 backdrop-blur">
      {/* Instance picker */}
      <div ref={pickerRef} className="relative w-72">
        <button
          onClick={() => (instances.length ? setPickerOpen((o) => !o) : openModal({ kind: 'create-instance' }))}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-2 pr-3 text-left shadow-soft transition-all hover:-translate-y-px hover:bg-raised"
        >
          {selected ? (
            <>
              <InstanceIcon url={selected.iconUrl} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{selected.name}</div>
                <div className="truncate text-xs text-muted">
                  {LOADER_NAMES[selected.loader]} {selected.mcVersion}
                </div>
              </div>
              <ChevronUp size={16} className={`text-muted transition-transform ${pickerOpen ? '' : 'rotate-180'}`} />
            </>
          ) : (
            <>
              <div className="grid size-11 place-items-center rounded-xl bg-raised text-mint">
                <Plus size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold">Create an instance</div>
                <div className="text-xs text-muted">Pick a version to start</div>
              </div>
            </>
          )}
        </button>
        {pickerOpen && (
          <div className="absolute bottom-[calc(100%+10px)] left-0 w-80 animate-pop rounded-2xl border border-border bg-surface p-2 shadow-lift">
            <div className="max-h-80 overflow-y-auto">
              {instances.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => {
                    update({ selectedInstance: inst.id })
                    setPickerOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-raised"
                >
                  <InstanceIcon url={inst.iconUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{inst.name}</div>
                    <div className="truncate text-xs text-muted">
                      {LOADER_NAMES[inst.loader]} {inst.mcVersion} · {inst.lastPlayed ? `played ${timeAgo(inst.lastPlayed)}` : 'never played'}
                    </div>
                  </div>
                  {inst.id === selected?.id && <Check size={16} className="text-mint" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPickerOpen(false)
                openModal({ kind: 'create-instance' })
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-border p-2 pt-3 text-left text-sm font-medium text-mint transition-colors hover:bg-raised"
            >
              <div className="grid size-9 place-items-center rounded-xl bg-mint/10">
                <Plus size={18} />
              </div>
              New instance
            </button>
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="min-w-0 flex-1">
        {launching || running.length ? (
          <div className="animate-pop">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="truncate">{launching ? progress.message : running.length === 1 ? `${running[0].title}: ${running[0].detail}` : `${running.length} downloads in progress`}</span>
              {pct != null && <span className="tabular-nums text-muted">{Math.round(pct * 100)}%</span>}
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-raised">
              {pct == null ? (
                <div className="absolute inset-y-0 w-2/5 animate-indeterminate rounded-full bg-gradient-to-r from-mint/0 via-mint to-mint/0" />
              ) : (
                <div className="h-full rounded-full bg-gradient-to-r from-mint-deep to-mint transition-[width] duration-200" style={{ width: `${pct * 100}%` }} />
              )}
            </div>
          </div>
        ) : progress.stage === 'error' ? (
          <p className="truncate text-sm text-danger">{progress.message}</p>
        ) : selected ? (
          <button onClick={() => navigate({ name: 'instance', id: selected.id })} className="text-left text-sm text-muted transition-colors hover:text-text">
            {selected.lastPlayed ? `Last played ${timeAgo(selected.lastPlayed)}` : 'Ready for its first launch'}
          </button>
        ) : null}
      </div>

      {/* Downloads + Play */}
      <div ref={tasksRef} className="relative">
        <button
          aria-label="Downloads"
          onClick={() => setTasksOpen((o) => !o)}
          className={`relative grid size-11 place-items-center rounded-xl border border-border transition-colors hover:bg-raised ${tasksOpen ? 'bg-raised text-text' : 'bg-surface text-muted'}`}
        >
          <Download size={18} />
          {running.length > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-blue text-[10px] font-bold text-white">{running.length}</span>
          )}
        </button>
        {tasksOpen && <TasksPanel />}
      </div>
      <PlayButton busy={launching} disabled={!selected} onClick={() => selected && launch(selected.id)} />
    </div>
  )
}
