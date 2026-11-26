import { AlertCircle, CheckCircle2, Download, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'

export function TasksPanel() {
  const { tasks } = useStore()
  return (
    <div className="absolute bottom-[calc(100%+10px)] right-0 w-96 animate-pop rounded-2xl border border-border bg-surface shadow-lift">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Download size={15} className="text-blue" />
        <h3 className="text-sm font-semibold">Downloads</h3>
      </header>
      <div className="max-h-96 overflow-y-auto p-2">
        {tasks.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">Nothing downloading right now.</p>}
        {tasks.map((t) => (
          <div key={t.id} className="group rounded-xl px-3 py-2.5 transition-colors hover:bg-raised">
            <div className="flex items-center gap-2">
              {t.status === 'done' && <CheckCircle2 size={15} className="shrink-0 text-mint" />}
              {t.status === 'error' && <AlertCircle size={15} className="shrink-0 text-danger" />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
              {t.status !== 'running' && (
                <button aria-label="Dismiss" onClick={() => api.tasks.dismiss(t.id)} className="text-muted opacity-0 transition-opacity hover:text-text group-hover:opacity-100">
                  <X size={14} />
                </button>
              )}
            </div>
            <p className={`mt-0.5 truncate text-xs ${t.status === 'error' ? 'text-danger' : 'text-muted'}`} title={t.error ?? t.detail}>
              {t.status === 'error' ? t.error : t.detail}
            </p>
            {t.status === 'running' && (
              <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-bg">
                {t.progress == null ? (
                  <div className="absolute inset-y-0 w-2/5 animate-indeterminate rounded-full bg-blue" />
                ) : (
                  <div className="h-full rounded-full bg-blue transition-[width] duration-200" style={{ width: `${t.progress * 100}%` }} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
