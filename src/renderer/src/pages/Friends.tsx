import { useCallback, useEffect, useState } from 'react'
import { Check, LogIn, Send, UserPlus, Users, X } from 'lucide-react'
import type { Friend } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Empty, Spinner, TextField } from '@/components/ui'

/** PandaClient friends: see who's online and on which server, and join them in one click. */
export function Friends() {
  const { attempt, toast, selected, launch, running } = useStore()
  const [list, setList] = useState<Friend[] | null>(null)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [myServer, setMyServer] = useState<string | null>(null)

  const refresh = useCallback(() => {
    api.friends.myServer().then(setMyServer).catch(() => {})
    api.friends
      .list()
      .then((l) => (setList(l), setError('')))
      .catch((e) => (setList([]), setError(e instanceof Error ? e.message : String(e))))
  }, [])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30_000)
    return () => clearInterval(t)
  }, [refresh])

  const add = async () => {
    if (!name.trim()) return
    setAdding(true)
    const r = await attempt(() => api.friends.add(name.trim()))
    setAdding(false)
    if (r) {
      toast(r.status === 'friends' ? `You and ${r.username} are now friends` : `Friend request sent to ${r.username}`, 'success')
      setName('')
      refresh()
    }
  }

  const join = (f: Friend) => {
    if (!selected) return toast('Make an instance first', 'error')
    if (running.has(selected.id)) return toast(`${selected.name} is already running`, 'error')
    launch(selected.id, { server: f.server! })
    toast(`Joining ${f.username} on ${f.server} with ${selected.name}`, 'success')
  }

  const incoming = list?.filter((f) => f.status === 'incoming') ?? []
  const outgoing = list?.filter((f) => f.status === 'outgoing') ?? []
  const friends = (list?.filter((f) => f.status === 'friends') ?? []).sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username))
  const head = (uuid: string) => `https://mc-heads.net/avatar/${uuid}/40`

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Friends</h1>
      <p className="mt-1 text-sm text-muted">Add friends who use PandaClient. See what server they're on and join them in one click.</p>

      <div className="mt-6 flex gap-2">
        <div className="flex-1">
          <TextField value={name} onChange={setName} placeholder="Minecraft username" onEnter={add} />
        </div>
        <Button variant="primary" onClick={add} busy={adding}>
          <UserPlus size={15} /> Add friend
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {list === null && <Spinner className="mx-auto mt-10" />}

      {incoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Friend requests</h2>
          {incoming.map((f) => (
            <div key={f.uuid} className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <img src={head(f.uuid)} className="size-10 rounded-lg" alt="" />
              <span className="flex-1 font-medium">{f.username}</span>
              <Button size="sm" variant="primary" onClick={async () => (await attempt(() => api.friends.accept(f.uuid), `You and ${f.username} are now friends`), refresh())}>
                <Check size={14} /> Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => (await attempt(() => api.friends.remove(f.uuid)), refresh())}>
                <X size={14} />
              </Button>
            </div>
          ))}
        </section>
      )}

      {list !== null && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Friends · {friends.filter((f) => f.online).length} online
          </h2>
          {friends.length === 0 && <Empty icon={<Users size={28} />} title="No friends yet">Add someone by their Minecraft username above.</Empty>}
          {friends.map((f) => (
            <div key={f.uuid} className="group mb-2 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="relative">
                <img src={head(f.uuid)} className={`size-10 rounded-lg ${f.online ? '' : 'opacity-50 grayscale'}`} alt="" />
                <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${f.online ? 'bg-mint' : 'bg-muted'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{f.username}</p>
                <p className="truncate text-xs text-muted">{f.online ? (f.server ? `Playing on ${f.server}` : 'Online') : 'Offline'}</p>
              </div>
              {f.online && myServer && myServer !== 'Singleplayer' && f.server !== myServer && (
                <Button size="sm" variant="secondary" onClick={() => attempt(() => api.friends.invite(f.uuid), `Invited ${f.username} to ${myServer}`)}>
                  <Send size={13} /> Invite
                </Button>
              )}
              {f.server && f.server !== 'Singleplayer' && (
                <Button size="sm" variant="primary" onClick={() => join(f)}>
                  <LogIn size={14} /> Join
                </Button>
              )}
              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={async () => (await attempt(() => api.friends.remove(f.uuid), 'Friend removed'), refresh())}>
                <X size={14} />
              </Button>
            </div>
          ))}
          {outgoing.length > 0 && <p className="mt-4 text-xs text-muted">Waiting for: {outgoing.map((f) => f.username).join(', ')}</p>}
        </section>
      )}
    </div>
  )
}
