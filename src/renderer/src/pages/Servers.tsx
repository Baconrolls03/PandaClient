import { useEffect, useState } from 'react'
import { Copy, LogIn, Signal } from 'lucide-react'
import type { ServerStatus } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Spinner } from '@/components/ui'

const SERVERS = [
  { name: 'Hypixel', address: 'mc.hypixel.net', tags: 'Bedwars · Skywars · Duels' },
  { name: 'Minemen Club', address: 'minemen.club', tags: 'Practice PvP · Ranked' },
  { name: 'PvP Land', address: 'pvp.land', tags: 'Practice · Duels' },
  { name: 'Hoplite', address: 'hoplite.gg', tags: 'Battle Royale' },
  { name: 'CubeCraft', address: 'play.cubecraft.net', tags: 'Eggwars · Skywars' },
  { name: 'DonutSMP', address: 'donutsmp.net', tags: 'SMP · PvP' }
]

/** Popular PvP servers with live player counts and one-click Join. */
export function Servers() {
  const { selected, launch, toast, running } = useStore()
  const [status, setStatus] = useState<Record<string, ServerStatus | 'offline' | undefined>>({})
  useEffect(() => {
    for (const s of SERVERS)
      api.servers
        .ping(s.address)
        .then((r) => setStatus((cur) => ({ ...cur, [s.address]: r })))
        .catch(() => setStatus((cur) => ({ ...cur, [s.address]: 'offline' })))
  }, [])
  const join = (address: string) => {
    if (!selected) return toast('Make an instance first', 'error')
    if (running.has(selected.id)) return toast(`${selected.name} is already running`, 'error')
    launch(selected.id, { server: address })
    toast(`Joining ${address} with ${selected.name}`, 'success')
  }
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Servers</h1>
      <p className="mt-1 text-sm text-muted">Popular PvP servers. Join starts {selected ? <b>{selected.name}</b> : 'your instance'} and connects straight away.</p>
      <div className="mt-6 grid gap-3 @container sm:grid-cols-2">
        {SERVERS.map((s) => {
          const st = status[s.address]
          return (
            <div key={s.address} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              {st && st !== 'offline' && st.icon ? (
                <img src={st.icon} className="size-12 rounded-lg" alt="" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="grid size-12 place-items-center rounded-lg bg-raised text-lg font-bold text-mint">{s.name[0]}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.name}</p>
                <p className="truncate text-xs text-muted">{s.tags}</p>
                <p className="mt-1 flex items-center gap-1 text-xs">
                  {st === undefined && <Spinner className="size-3" />}
                  {st === 'offline' && <span className="text-muted">Couldn't reach</span>}
                  {st && st !== 'offline' && (
                    <>
                      <Signal size={12} className="text-mint" />
                      <span className="text-mint">{st.online.toLocaleString()} playing</span>
                      <span className="text-muted">· {st.pingMs} ms</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="primary" onClick={() => join(s.address)}>
                  <LogIn size={14} /> Join
                </Button>
                <Button size="sm" variant="ghost" onClick={() => (navigator.clipboard.writeText(s.address), toast('Address copied', 'success'))}>
                  <Copy size={13} /> IP
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
