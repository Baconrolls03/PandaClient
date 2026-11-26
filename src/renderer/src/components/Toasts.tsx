import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useStore } from '@/lib/store'

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="pointer-events-none fixed right-5 top-14 z-[60] flex w-96 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex animate-pop items-start gap-3 rounded-xl border border-border bg-raised px-4 py-3 text-sm shadow-lift">
          {t.kind === 'error' ? (
            <AlertCircle size={17} className="mt-px shrink-0 text-danger" />
          ) : t.kind === 'success' ? (
            <CheckCircle2 size={17} className="mt-px shrink-0 text-mint" />
          ) : (
            <Info size={17} className="mt-px shrink-0 text-blue" />
          )}
          <span className="flex-1 leading-snug">{t.text}</span>
          <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="text-muted hover:text-text">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
