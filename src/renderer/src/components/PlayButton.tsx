import { Loader2, Play } from 'lucide-react'

export function PlayButton({ busy, disabled, onClick, size = 'lg' }: { busy: boolean; disabled?: boolean; onClick: () => void; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-14 min-w-48 px-9 text-lg' : 'h-11 min-w-32 px-6 text-base'
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`group relative flex items-center justify-center gap-2.5 rounded-2xl bg-mint font-bold tracking-tight text-ink shadow-mint transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7ff09f] hover:shadow-[0_16px_44px_-10px_rgb(110_224_143/0.7)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-default disabled:opacity-70 disabled:shadow-none ${dims}`}
    >
      {busy ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" className="transition-transform duration-200 group-hover:scale-110" />}
      {busy ? 'Launching' : 'Play'}
    </button>
  )
}
