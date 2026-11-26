import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, WifiOff } from 'lucide-react'
import type { VersionInfo } from '@shared/types'

interface Props {
  versions: VersionInfo[]
  value: string
  onChange: (id: string) => void
  showSnapshots: boolean
  onShowSnapshots: (v: boolean) => void
  offline?: boolean
  loading?: boolean
}

function groupKey(v: VersionInfo): string {
  if (v.type === 'snapshot') return 'Snapshots'
  return v.id.split('.').slice(0, 2).join('.')
}

function Badge({ fabric }: { fabric: boolean }) {
  return fabric ? (
    <span className="rounded-md bg-mint/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mint">
      Fabric
    </span>
  ) : (
    <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      Vanilla
    </span>
  )
}

export function VersionSelect({ versions, value, onChange, showSnapshots, onShowSnapshots, offline, loading }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const current = versions.find((v) => v.id === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = versions.filter(
      (v) => (v.type === 'release' || (showSnapshots && v.type === 'snapshot')) && (!q || v.id.toLowerCase().includes(q))
    )
    const map = new Map<string, VersionInfo[]>()
    for (const v of list) {
      const k = groupKey(v)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(v)
    }
    return [...map.entries()]
  }, [versions, query, showSnapshots])

  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className={`flex h-16 w-64 items-center gap-3 rounded-2xl border bg-surface px-4 text-left shadow-soft transition-all duration-150 hover:-translate-y-px hover:bg-raised ${
          open ? 'border-blue/60' : 'border-border'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Version</div>
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold">{loading ? 'Loading…' : current?.id ?? 'Select'}</span>
            {current && <Badge fabric={current.fabric} />}
          </div>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-80 animate-pop overflow-hidden rounded-2xl border border-border bg-surface shadow-lift">
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2">
              <Search size={15} className="text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search versions"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-between px-1 text-xs text-muted">
              Show snapshots
              <input
                type="checkbox"
                checked={showSnapshots}
                onChange={(e) => onShowSnapshots(e.target.checked)}
                className="size-4 accent-mint"
              />
            </label>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {offline && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-raised px-3 py-2 text-xs text-muted">
                <WifiOff size={14} /> Offline. Showing cached versions.
              </div>
            )}
            {groups.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted">No versions found</div>}
            {groups.map(([group, list]) => (
              <div key={group} className="mb-1">
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{group}</div>
                {list.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onChange(v.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-raised ${
                      v.id === value ? 'bg-raised' : ''
                    }`}
                  >
                    <span className="flex-1 text-left font-medium">{v.id}</span>
                    <Badge fabric={v.fabric} />
                    <Check size={15} className={v.id === value ? 'text-mint' : 'invisible'} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
