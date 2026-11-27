import { useEffect, useState } from 'react'
import { Check, Download, Send, Share2, UserRound } from 'lucide-react'
import type { Instance, SharePlayer } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Modal, SearchField, Spinner } from '@/components/ui'

/** Export an instance: save it as a file, or send it to other PandaClient players. */
export function ExportModal({ inst, onClose }: { inst: Instance; onClose: () => void }) {
  const { attempt, toast } = useStore()
  const [mode, setMode] = useState<'choose' | 'share'>('choose')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SharePlayer[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<SharePlayer[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (mode !== 'share' || !q.trim()) return setResults([])
    setSearching(true)
    const t = setTimeout(() => {
      api.share
        .players(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q, mode])

  const toggle = (p: SharePlayer) => setPicked((cur) => (cur.some((x) => x.uuid === p.uuid) ? cur.filter((x) => x.uuid !== p.uuid) : [...cur, p]))

  const download = async () => {
    const p = await attempt(() => api.instances.exportMrpack(inst.id))
    if (p) {
      toast(`Exported to ${p}`, 'success')
      onClose()
    }
  }

  const share = async () => {
    setBusy(true)
    const n = await attempt(() => api.share.send(inst.id, picked.map((p) => p.uuid)))
    setBusy(false)
    if (n) {
      toast(`Shared mod profile with ${picked.map((p) => p.username).join(', ')}`, 'success')
      onClose()
    }
  }

  if (mode === 'choose')
    return (
      <Modal title={`Export ${inst.name}`} onClose={onClose} width="max-w-md">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode('share')} className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-raised p-5 text-center transition hover:border-mint/60 hover:bg-raised/80">
            <Share2 size={22} className="text-mint" />
            <span className="font-semibold">Share</span>
            <span className="text-xs text-muted">Send it to friends who use PandaClient</span>
          </button>
          <button onClick={download} className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-raised p-5 text-center transition hover:border-blue/60 hover:bg-raised/80">
            <Download size={22} className="text-blue" />
            <span className="font-semibold">Download</span>
            <span className="text-xs text-muted">Save it as a .mrpack file</span>
          </button>
        </div>
      </Modal>
    )

  return (
    <Modal
      title={`Share ${inst.name}`}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={() => setMode('choose')}>
            Back
          </Button>
          <Button variant="primary" onClick={share} disabled={!picked.length} busy={busy}>
            <Send size={14} /> Share{picked.length ? ` with ${picked.length}` : ''}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">Search for players who use PandaClient. They'll get a pop-up to add this profile.</p>
      <SearchField value={q} onChange={setQ} placeholder="Minecraft username" />
      {picked.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {picked.map((p) => (
            <button key={p.uuid} onClick={() => toggle(p)} className="flex items-center gap-1.5 rounded-full bg-mint/15 py-1 pl-1 pr-2.5 text-xs font-medium text-mint">
              <img src={`https://mc-heads.net/avatar/${p.uuid}/20`} className="size-5 rounded-full" alt="" /> {p.username} ×
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 min-h-24">
        {searching && <Spinner className="mx-auto mt-6" />}
        {!searching && q.trim() !== '' && results.length === 0 && <p className="mt-6 text-center text-sm text-muted">No PandaClient players found with that name.</p>}
        {!searching &&
          results.map((p) => {
            const on = picked.some((x) => x.uuid === p.uuid)
            return (
              <button key={p.uuid} onClick={() => toggle(p)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-raised ${on ? 'bg-raised' : ''}`}>
                <img src={`https://mc-heads.net/avatar/${p.uuid}/32`} className="size-8 rounded-md" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{p.username}</span>
                  <span className={`text-xs ${p.online ? 'text-mint' : 'text-muted'}`}>{p.online ? 'Online' : 'Offline'}</span>
                </span>
                {on ? <Check size={16} className="text-mint" /> : <UserRound size={16} className="text-muted" />}
              </button>
            )
          })}
      </div>
    </Modal>
  )
}
