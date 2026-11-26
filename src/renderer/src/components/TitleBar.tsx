import { Minus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { Logo } from './Logo'

export function TitleBar() {
  return (
    <header className="drag flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-bg pl-4">
      <div className="flex items-center gap-2.5">
        <Logo size={20} />
        <span className="text-[13px] font-semibold tracking-tight">
          Panda<span className="text-mint">Client</span>
        </span>
      </div>
      <div className="no-drag flex h-full">
        <button
          aria-label="Minimise"
          onClick={() => api.window.minimize()}
          className="grid h-full w-12 place-items-center text-muted transition-colors hover:bg-raised hover:text-text"
        >
          <Minus size={16} />
        </button>
        <button
          aria-label="Close"
          onClick={() => api.window.close()}
          className="grid h-full w-12 place-items-center text-muted transition-colors hover:bg-danger hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  )
}
