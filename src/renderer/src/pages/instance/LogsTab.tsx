import { useCallback, useEffect, useMemo, useState } from 'react'
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

export function LogsTab({ inst }: { inst: Instance }) {
  const { toast } = useStore()
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
  const loadText = useCallback(() => {
    if (!current) return
    setText(null)
    api.logs.read(inst.id, current).then(setText).catch((e) => setText(String(e)))
  }, [inst.id, current])
  useEffect(loadText, [loadText])

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
          <SearchField value={q} onChange={setQ} placeholder="Filter lines" className="flex-1" />
          <Chip active={level === 'all'} onClick={() => setLevel('all')}>All</Chip>
          <Chip active={level === 'warn'} onClick={() => setLevel('warn')}>Warnings</Chip>
          <Chip active={level === 'error'} onClick={() => setLevel('error')}>Errors</Chip>
          <Button size="sm" variant="ghost" onClick={loadText} title="Reload">
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
        <pre className="h-[52vh] select-text overflow-auto rounded-2xl border border-border bg-bg p-4 font-mono text-[12px] leading-relaxed">
          {text == null ? 'Loading…' : lines.map((l, i) => <div key={i} className={lineClass(l)}>{l || ' '}</div>)}
        </pre>
      </div>
    </div>
  )
}
