import { Loader2, Play } from 'lucide-react'

export function PlayButton({ busy, disabled, onClick }: { busy: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="group relative flex h-16 min-w-56 items-center justify-center gap-3 rounded-2xl bg-mint px-10 text-xl font-bold tracking-tight text-ink shadow-mint transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7ff09f] hover:shadow-[0_16px_44px_-10px_rgb(110_224_143/0.7)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-default disabled:opacity-80 disabled:shadow-none"
    >
      {busy ? (
        <Loader2 size={22} className="animate-spin" />
      ) : (
        <Play size={22} fill="currentColor" className="transition-transform duration-200 group-hover:scale-110" />
      )}
      {busy ? 'Launching' : 'Play'}
    </button>
  )
}
