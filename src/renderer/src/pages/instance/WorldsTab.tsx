import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, Globe, Play, Plus, Server, Trash2 } from 'lucide-react'
import type { Instance, ServerEntry, WorldInfo } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { timeAgo } from '@/lib/format'
import { Badge, Button, ConfirmIconButton, Empty, IconButton, Spinner, TextField } from '@/components/ui'

export function WorldsTab({ inst }: { inst: Instance }) {
  const { attempt, launch, running } = useStore()
  const isRunning = running.has(inst.id)
  const [worlds, setWorlds] = useState<WorldInfo[] | null>(null)
  const [servers, setServers] = useState<ServerEntry[] | null>(null)
  const [name, setName] = useState('')
  const [ip, setIp] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    api.worlds.list(inst.id).then(setWorlds).catch(() => setWorlds([]))
    api.worlds.servers(inst.id).then(setServers).catch(() => setServers([]))
  }, [inst.id])
  useEffect(load, [load])

  async function addServer() {
    const r = await attempt(() => api.worlds.addServer(inst.id, { name, ip }), 'Server added')
    if (r) {
      setServers(r)
      setName('')
      setIp('')
      setAdding(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Globe size={16} className="text-mint" /> Singleplayer worlds
          </h2>
          <Button size="sm" variant="ghost" onClick={() => api.instances.openFolder(inst.id, 'saves')}>
            <FolderOpen size={14} /> Open saves
          </Button>
        </div>
        {worlds == null ? (
          <Spinner />
        ) : worlds.length === 0 ? (
          <Empty icon={<Globe size={22} />} title="No worlds yet">
            Worlds you create in game show up here.
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {worlds.map((w) => (
              <div key={w.folder} className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft transition-colors hover:bg-raised">
                {w.iconUrl ? (
                  <img src={w.iconUrl} alt="" className="size-14 rounded-xl object-cover [image-rendering:pixelated]" />
                ) : (
                  <div className="grid size-14 place-items-center rounded-xl bg-raised text-muted">
                    <Globe size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{w.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    {w.gameMode && <Badge tone={w.gameMode === 'Hardcore' ? 'danger' : w.gameMode === 'Creative' ? 'blue' : 'mint'}>{w.gameMode}</Badge>}
                    <span>Played {timeAgo(w.lastPlayed)}</span>
                  </div>
                </div>
                <Button size="sm" variant="primary" disabled={isRunning} onClick={() => launch(inst.id, { world: w.folder })} title="Launch straight into this world">
                  <Play size={13} fill="currentColor" /> Play
                </Button>
                <IconButton label="Open folder" onClick={() => api.instances.openFolder(inst.id, `saves/${w.folder}`)}>
                  <FolderOpen size={15} />
                </IconButton>
                <ConfirmIconButton
                  label="Delete world"
                  onConfirm={async () => {
                    await attempt(() => api.worlds.remove(inst.id, w.folder), 'World moved to the Recycle Bin')
                    load()
                  }}
                >
                  <Trash2 size={15} />
                </ConfirmIconButton>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Server size={16} className="text-blue" /> Servers
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setAdding((a) => !a)}>
            <Plus size={14} /> Add server
          </Button>
        </div>
        {adding && (
          <div className="mb-3 flex animate-pop flex-col gap-2 rounded-2xl border border-border bg-surface p-3 shadow-soft">
            <TextField value={name} onChange={setName} placeholder="Server name" autoFocus />
            <div className="flex gap-2">
              <TextField value={ip} onChange={setIp} placeholder="play.example.com" mono className="flex-1" onEnter={addServer} />
              <Button variant="primary" onClick={addServer} disabled={!ip.trim()}>
                Add
              </Button>
            </div>
          </div>
        )}
        {servers == null ? (
          <Spinner />
        ) : servers.length === 0 && !adding ? (
          <Empty icon={<Server size={22} />} title="No servers saved">
            Add one here or from the in-game multiplayer screen.
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {servers.map((s, i) => (
              <div key={`${s.ip}-${i}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft transition-colors hover:bg-raised">
                {s.iconUrl ? (
                  <img src={s.iconUrl} alt="" className="size-12 rounded-xl [image-rendering:pixelated]" />
                ) : (
                  <div className="grid size-12 place-items-center rounded-xl bg-raised text-muted">
                    <Server size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="truncate font-mono text-xs text-muted">{s.ip}</div>
                </div>
                <Button size="sm" variant="primary" disabled={isRunning} onClick={() => launch(inst.id, { server: s.ip })} title="Launch and join this server">
                  <Play size={13} fill="currentColor" /> Join
                </Button>
                <ConfirmIconButton
                  label="Remove server"
                  onConfirm={async () => {
                    const r = await attempt(() => api.worlds.removeServer(inst.id, i))
                    if (r) setServers(r)
                  }}
                >
                  <Trash2 size={15} />
                </ConfirmIconButton>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
