import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Copy, RefreshCw, ScrollText, TriangleAlert } from 'lucide-react'
import type { Instance, LogFile } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { bytes, timeAgo } from '@/lib/format'
import { Button, Chip, Empty, SearchField, Spinner } from '@/components/ui'

function lineClass(l: string) {
  if (/\/(ERROR|FATAL)\]|Exception|^\s+at /.test(l)) return 'text-danger'
  if (/\/WARN\]/.test(l)) return 'text-amber-300'
  return ''
}

/** The line with every match of the search highlighted. */
function highlight(l: string, q: string): ReactNode {
  if (!q) return l || ' '
  const out: ReactNode[] = []
  const low = l.toLowerCase()
  let i = 0
  for (let at = low.indexOf(q); at >= 0; at = low.indexOf(q, i)) {
    out.push(l.slice(i, at), <mark key={at} className="rounded-sm bg-mint/30 text-text">{l.slice(at, at + q.length)}</mark>)
    i = at + q.length
  }
  out.push(l.slice(i))
  return out
}

export function LogsTab({ inst }: { inst: Instance }) {
  const { toast, running } = useStore()
  const box = useRef<HTMLPreElement>(null)
  const [follow, setFollow] = useState(true)
  const [logs, setLogs] = useState<LogFile[] | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [level, setLevel] = useState<'all' | 'warn' | 'error'>('all')

  const loadList = useCallback(() => {
    api.logs.list(inst.id).then((l) => {
      setLogs(l)
      setCurrent((c) => c ?? l[0]?.path ?? null)
    })
  }, [inst.id])
  useEffect(loadList, [loadList])
  const loadText = useCallback(
    (quiet = false) => {
      if (!current) return
      if (!quiet) setText(null)
      api.logs.read(inst.id, current).then(setText).catch((e) => setText(String(e)))
    },
    [inst.id, current]
  )
  useEffect(() => loadText(), [loadText])

  // Live: while the game runs, keep latest.log up to date as Minecraft writes it.
  const isLatest = logs?.find((l) => l.path === current)?.name === 'latest.log'
  const live = running.has(inst.id) && isLatest
  useEffect(() => {
    if (!live) return
    let pending = false
    const off = api.logs.onLive((e) => {
      if (e.instanceId !== inst.id || pending) return
      pending = true
      setTimeout(() => ((pending = false), loadText(true)), 1000)
    })
    return off
  }, [live, inst.id, loadText])
  useEffect(() => {
    if (live && follow && box.current) box.current.scrollTop = box.current.scrollHeight
  })

  const lines = useMemo(() => {
    let l = (text ?? '').split('\n')
    if (level === 'warn') l = l.filter((x) => /\/(WARN|ERROR|FATAL)\]/.test(x))
    if (level === 'error') l = l.filter((x) => /\/(ERROR|FATAL)\]|Exception|^\s+at /.test(x))
    if (q) l = l.filter((x) => x.toLowerCase().includes(q.toLowerCase()))
    return l.slice(-5000)
  }, [text, q, level])

  if (logs == null) return <Spinner />
  if (logs.length === 0) return <Empty icon={<ScrollText size={22} />} title="No logs yet">Logs and crash reports appear after you play.</Empty>

  return (
    <div className="grid grid-cols-[240px_1fr] gap-4">
      <div className="flex flex-col gap-1">
        {logs.map((l) => (
          <button
            key={l.path}
            onClick={() => setCurrent(l.path)}
            className={`rounded-xl px-3 py-2 text-left transition-colors ${current === l.path ? 'bg-raised' : 'hover:bg-surface'}`}
          >
            <div className="flex items-center gap-1.5 truncate text-sm font-medium">
              {l.kind === 'crash' && <TriangleAlert size={13} className="shrink-0 text-danger" />}
              <span className="truncate">{l.name}</span>
            </div>
            <div className="text-[11px] text-muted">
              {timeAgo(l.mtime)} · {bytes(l.size)}
            </div>
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <SearchField value={q} onChange={setQ} placeholder="Search the log" className="flex-1" />
          {q && <span className="shrink-0 text-xs tabular-nums text-muted">{lines.length} match{lines.length === 1 ? '' : 'es'}</span>}
          {live && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-semibold text-mint">
              <span className="size-1.5 animate-pulse rounded-full bg-mint" /> LIVE
            </span>
          )}
          <Chip active={level === 'all'} onClick={() => setLevel('all')}>All</Chip>
          <Chip active={level === 'warn'} onClick={() => setLevel('warn')}>Warnings</Chip>
          <Chip active={level === 'error'} onClick={() => setLevel('error')}>Errors</Chip>
          <Button size="sm" variant="ghost" onClick={() => loadText()} title="Reload">
            <RefreshCw size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Copy"
            onClick={() => text && navigator.clipboard.writeText(text).then(() => toast('Log copied', 'success'))}
          >
            <Copy size={14} />
          </Button>
        </div>
        <pre
          ref={box}
          onScroll={(e) => {
            const el = e.currentTarget
            setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
          }}
          className="h-[52vh] select-text overflow-auto rounded-2xl border border-border bg-bg p-4 font-mono text-[12px] leading-relaxed">
          {text == null ? 'Loading…' : lines.map((l, i) => (
                <div key={i} className={lineClass(l)}>
                  {highlight(l, q.toLowerCase())}
                </div>
              ))}
        </pre>
      </div>
    </div>
  )
}
