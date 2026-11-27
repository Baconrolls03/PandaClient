import { useEffect, useRef, useState } from 'react'
import { Clock, Compass, FileUp, Flame, LayoutGrid, Plus, Settings2, Users, Zap } from 'lucide-react'
import type { Instance, PlayStats } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { playtime, timeAgo } from '@/lib/format'
import { artFor } from '@/lib/lobbyArt'
import { PlayButton } from '@/components/PlayButton'
import { Button } from '@/components/ui'

/** A big picture card for one profile in the lobby's bottom row. */
function ProfileCard({ inst, active, onClick, delay }: { inst: Instance; active: boolean; onClick: () => void; delay: number }) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative h-28 w-52 shrink-0 animate-rise overflow-hidden rounded-2xl border-2 text-left shadow-lift transition-all duration-200 hover:-translate-y-1 ${active ? 'border-blue' : 'border-white/10 hover:border-white/30'}`}
    >
      <img src={artFor(inst.id)} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-x-3 bottom-2.5">
        <div className="truncate text-[15px] font-bold text-white drop-shadow">{inst.name}</div>
        <div className="truncate text-[11px] text-white/70">Minecraft {inst.mcVersion}</div>
      </div>
    </button>
  )
}

/** The lobby: full-screen artwork for the selected profile, Launch, and every profile along the bottom. */
export function Home() {
  const { selected, instances, navigate, openModal, attempt, update, toast, settings, online } = useStore()
  const [stats, setStats] = useState<PlayStats | null>(null)
  const [friendsOnline, setFriendsOnline] = useState<number | null>(null)
  const [quickBusy, setQuickBusy] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const frame = useRef(0)

  useEffect(() => {
    api.stats.get().then(setStats).catch(() => {})
    api.friends.list().then((l) => setFriendsOnline(l.filter((f) => f.status === 'friends' && f.online).length)).catch(() => {})
  }, [])

  // Parallax: the picture follows the mouse a little.
  const onMove = (e: React.MouseEvent) => {
    if (settings.reduceMotion) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => setTilt({ x, y }))
  }

  async function quickSetup() {
    setQuickBusy(true)
    const inst = await attempt(async () => {
      const list = await api.versions.list()
      const mc = list.versions.find((v) => v.type === 'release' && v.fabric)?.id
      if (!mc) throw new Error("Couldn't reach Mojang to find the latest version.")
      return api.instances.create({ name: 'PandaClient', mcVersion: mc, loaderVersion: null, bundle: 'pvp' })
    })
    setQuickBusy(false)
    if (inst) {
      update({ selectedInstance: inst.id })
      toast(`PandaClient ${inst.mcVersion} is set up. Mods are downloading.`, 'success')
    }
  }

  const art = artFor(selected?.id)
  const recent = [...instances].sort((a, b) => (b.lastPlayed ?? b.created).localeCompare(a.lastPlayed ?? a.created)).slice(0, 6)

  return (
    <div onMouseMove={onMove} className="relative flex h-full min-h-[560px] flex-col overflow-hidden bg-black">
      {/* Artwork with a slow drift and parallax */}
      <div className="absolute -inset-6 transition-transform duration-700 ease-out" style={{ transform: `translate(${tilt.x * -18}px, ${tilt.y * -12}px)` }}>
        <img key={art} src={art} alt="" className="size-full object-cover [animation:var(--animate-fade),var(--animate-drift)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40" />

      {/* Title, details and Launch */}
      <div className="relative flex flex-1 flex-col justify-center px-12">
        {selected ? (
          <div key={selected.id} className="max-w-xl">
            <p className="animate-rise text-xs font-semibold uppercase tracking-[0.2em] text-mint">
              {selected.lastPlayed ? 'Continue playing' : 'Ready to play'}
              {online != null && <span className="ml-3 rounded-full bg-white/10 px-2 py-0.5 normal-case tracking-normal text-white/80">{online.toLocaleString()} online</span>}
            </p>
            <h1 className="mt-2 animate-rise text-5xl font-extrabold tracking-tight text-white drop-shadow-lg [animation-delay:60ms]">{selected.name}</h1>
            <p className="mt-2 animate-rise text-sm text-white/70 [animation-delay:120ms]">
              Minecraft {selected.mcVersion} · Fabric · {selected.lastPlayed ? `Played ${timeAgo(selected.lastPlayed)}` : 'Never played'}
              {settings.showPlayTime && selected.playtimeSec > 0 && ` · ${playtime(selected.playtimeSec)} played`}
            </p>
            <div className="mt-6 flex animate-rise items-center gap-3 [animation-delay:180ms]">
              <PlayButton instanceId={selected.id} label="Launch" />
              <button
                title="Manage profile"
                onClick={() => navigate({ name: 'instance', id: selected.id })}
                className="grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <Settings2 size={20} />
              </button>
              <button
                title="Add mods"
                onClick={() => navigate({ name: 'discover', type: 'mod', instanceId: selected.id })}
                className="grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="mt-6 flex animate-rise flex-wrap gap-2 [animation-delay:240ms]">
              <button onClick={() => navigate({ name: 'stats' })} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/85 backdrop-blur hover:bg-black/50">
                <Flame size={13} className={stats?.currentStreak ? 'text-orange-400' : ''} /> {stats ? `${stats.currentStreak} day streak` : 'Streak'}
              </button>
              <button onClick={() => navigate({ name: 'stats' })} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/85 backdrop-blur hover:bg-black/50">
                <Clock size={13} /> {stats ? `${playtime(stats.todaySec)} today` : 'Today'}
              </button>
              <button onClick={() => navigate({ name: 'friends' })} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/85 backdrop-blur hover:bg-black/50">
                <Users size={13} className="text-mint" /> {friendsOnline ?? 0} friends online
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-xl">
            <p className="animate-rise text-xs font-semibold uppercase tracking-[0.2em] text-mint">Welcome to PandaClient</p>
            <h1 className="mt-2 animate-rise text-5xl font-extrabold tracking-tight text-white [animation-delay:60ms]">Let's get you playing</h1>
            <p className="mt-3 animate-rise text-sm text-white/70 [animation-delay:120ms]">One click sets up the newest Minecraft with PandaClient and the PvP mods.</p>
            <div className="mt-6 flex animate-rise flex-wrap gap-3 [animation-delay:180ms]">
              <Button size="lg" variant="primary" busy={quickBusy} onClick={quickSetup}>
                {!quickBusy && <Zap size={18} />} Quick setup
              </Button>
              <Button size="lg" variant="secondary" onClick={() => openModal({ kind: 'create-instance' })}>
                <Plus size={18} /> Custom profile
              </Button>
              <Button size="lg" variant="ghost" onClick={() => openModal({ kind: 'import' })}>
                <FileUp size={18} /> Import
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate({ name: 'discover', type: 'modpack' })}>
                <Compass size={18} /> Modpacks
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Every profile along the bottom */}
      {instances.length > 0 && (
        <div className="relative flex items-end gap-3 overflow-x-auto px-12 pb-8 pt-4">
          {recent.map((inst, i) => (
            <ProfileCard key={inst.id} inst={inst} active={inst.id === selected?.id} delay={260 + i * 50} onClick={() => update({ selectedInstance: inst.id })} />
          ))}
          <button
            title="All profiles"
            onClick={() => navigate({ name: 'library' })}
            style={{ animationDelay: `${260 + recent.length * 50}ms` }}
            className="grid h-28 w-20 shrink-0 animate-rise place-items-center rounded-2xl border-2 border-white/10 bg-black/40 text-white/80 backdrop-blur transition-all hover:-translate-y-1 hover:border-white/30 hover:text-white"
          >
            <LayoutGrid size={22} />
          </button>
          <button
            title="New profile"
            onClick={() => openModal({ kind: 'create-instance' })}
            style={{ animationDelay: `${310 + recent.length * 50}ms` }}
            className="grid h-28 w-20 shrink-0 animate-rise place-items-center rounded-2xl border-2 border-dashed border-white/15 bg-black/30 text-white/70 backdrop-blur transition-all hover:-translate-y-1 hover:border-blue hover:text-white"
          >
            <Plus size={22} />
          </button>
        </div>
      )}
    </div>
  )
}
