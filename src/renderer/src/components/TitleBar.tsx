import { ChevronLeft, Minus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Logo } from './Logo'
import { UpdatePill } from './UpdatePill'

export function TitleBar() {
  const { back, canGoBack } = useStore()
  return (
    <header className="drag flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-bg pl-4">
      <div className="flex items-center gap-2.5">
        <Logo size={20} />
        <span className="text-[13px] font-semibold tracking-tight">
          Panda<span className="text-mint">Client</span>
        </span>
        <button
          aria-label="Back"
          onClick={back}
          disabled={!canGoBack}
          className="no-drag ml-3 grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <div className="flex h-full items-center">
        <UpdatePill />
      <div className="no-drag flex h-full">
        <button aria-label="Minimise" onClick={() => api.window.minimize()} className="grid h-full w-12 place-items-center text-muted transition-colors hover:bg-raised hover:text-text">
          <Minus size={16} />
        </button>
        <button aria-label="Close" onClick={() => api.window.close()} className="grid h-full w-12 place-items-center text-muted transition-colors hover:bg-danger hover:text-white">
          <X size={16} />
        </button>
      </div>
      </div>
    </header>
  )
}
