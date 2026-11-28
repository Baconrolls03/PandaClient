import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import type { UpdateState } from '@shared/types'
import { api } from '@/lib/api'

export function useUpdateState(): UpdateState | null {
  const [s, setS] = useState<UpdateState | null>(null)
  useEffect(() => {
    api.updater.state().then(setS).catch(() => {})
    return api.updater.onChanged(setS)
  }, [])
  return s
}

/** Title-bar pill: shows download progress, then "Restart to update". */
export function UpdatePill() {
  const s = useUpdateState()
  if (!s || (s.status !== 'downloading' && s.status !== 'ready' && s.status !== 'available')) return null
  if (s.status === 'available')
    return (
      <button
        onClick={() => api.updater.install()}
        className="no-drag mr-2 flex h-7 animate-pop items-center gap-2 rounded-full bg-mint px-3 text-xs font-semibold text-ink shadow-mint transition-all hover:brightness-110"
        title={`PandaClient ${s.version} is out: download the installer`}
      >
        <Download size={13} /> Update {s.version}
      </button>
    )
  if (s.status === 'downloading')
    return (
      <div className="no-drag mr-2 flex h-7 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs text-muted" title={`Downloading PandaClient ${s.version}`}>
        <Download size={13} className="text-mint" />
        Update {s.version} · {Math.round((s.progress ?? 0) * 100)}%
      </div>
    )
  return (
    <button
      onClick={() => api.updater.install()}
      className="no-drag mr-2 flex h-7 animate-pop items-center gap-2 rounded-full bg-mint px-3 text-xs font-semibold text-ink shadow-mint transition-all hover:brightness-110"
      title="Restart PandaClient to finish updating"
    >
      <RefreshCw size={13} /> Update<span className="sr-only"> to {s.version}</span>
    </button>
  )
}
