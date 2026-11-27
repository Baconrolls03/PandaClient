import { useEffect, useState } from 'react'
import { ArrowRight, Compass, Download, FileUp, Plus, Shirt, Zap } from 'lucide-react'
import type { MrSearchHit, SearchQuery } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { compact, playtime, timeAgo } from '@/lib/format'
import { Logo } from '@/components/Logo'
import { PlayButton } from '@/components/PlayButton'
import { NewsCard } from '@/components/NewsCard'
import { InstanceCard } from '@/components/InstanceCard'
import { ProjectTile } from '@/components/ProjectCard'
import { Button, InstanceIcon, LoaderBadge, ProjectIcon } from '@/components/ui'

const query = (type: SearchQuery['type'], sort: SearchQuery['sort'], limit: number): SearchQuery => ({
  query: '',
  type,
  sort,
  categories: [],
  loaders: type === 'mod' || type === 'modpack' ? ['fabric'] : [],
  gameVersions: [],
  environment: type === 'mod' ? 'client' : null,
  offset: 0,
  limit
})

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SeeAll({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-mint">
      See all <ArrowRight size={13} />
    </button>
  )
}

export function Home() {
  const { selected, instances, navigate, openModal, attempt, update, toast, settings, online } = useStore()
  const [packs, setPacks] = useState<MrSearchHit[] | null>(null)
  const [mods, setMods] = useState<MrSearchHit[] | null>(null)
  const [quickBusy, setQuickBusy] = useState(false)

  useEffect(() => {
    api.modrinth.search(query('modpack', 'downloads', 5)).then((r) => setPacks(r.hits)).catch(() => setPacks([]))
    api.modrinth.search(query('mod', 'follows', 6)).then((r) => setMods(r.hits)).catch(() => setMods([]))
  }, [])

  async function quickSetup() {
    setQuickBusy(true)
    const inst = await attempt(async () => {
      const list = await api.versions.list()
      const mc = list.versions.find((v) => v.type === 'release' && v.fabric)?.id
      if (!mc) throw new Error("Couldn't reach Mojang to find the latest version.")
      return api.instances.create({ name: 'PandaClient', mcVersion: mc, loaderVersion: null, performancePack: true })
    })
    setQuickBusy(false)
    if (inst) {
      update({ selectedInstance: inst.id })
      toast(`PandaClient ${inst.mcVersion} is set up. Performance mods are downloading.`, 'success')
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 shadow-soft">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-28 size-96 rounded-full bg-mint/12 blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 size-96 rounded-full bg-blue/10 blur-3xl" />
          <Logo size={240} className="absolute -bottom-12 right-6 rotate-[-8deg] opacity-[0.07]" />
        </div>
        <div className="relative">
          {selected ? (
            <>
              <p className="mb-4 flex items-center gap-3 text-sm font-medium text-mint">
                {selected.lastPlayed ? 'Continue playing' : 'Ready to play'}
                {online != null && <span className="rounded-full bg-mint/10 px-2.5 py-0.5 text-xs text-mint">{online.toLocaleString()} online now</span>}
              </p>
              <div className="flex items-center gap-5">
                <InstanceIcon url={selected.iconUrl} preset={selected.iconPreset} size={84} className="rounded-2xl shadow-lift" />
                <div className="min-w-0">
                  <h1 className="truncate text-3xl font-bold tracking-tight">{selected.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <LoaderBadge version={selected.loaderVersion} />
                    <span>Minecraft {selected.mcVersion}</span>
                    <span>·</span>
                    <span>{selected.lastPlayed ? `Played ${timeAgo(selected.lastPlayed)}` : 'Never played'}</span>
                    {settings.showPlayTime && selected.playtimeSec > 0 && (
                      <>
                        <span>·</span>
                        <span>{playtime(selected.playtimeSec)} played</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <PlayButton instanceId={selected.id} />
                <Button size="lg" variant="secondary" onClick={() => navigate({ name: 'instance', id: selected.id })}>
                  Manage
                </Button>
                <Button size="lg" variant="ghost" onClick={() => navigate({ name: 'discover', type: 'mod', instanceId: selected.id })}>
                  <Plus size={18} /> Add mods
                </Button>
                <Button size="lg" variant="ghost" onClick={() => navigate({ name: 'wardrobe' })}>
                  <Shirt size={18} /> Wardrobe
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-1 text-sm font-medium text-mint">Welcome to PandaClient</p>
              <h1 className="text-3xl font-bold tracking-tight">Let's get you playing</h1>
              <p className="mt-2 max-w-lg text-sm text-muted">
                One click sets up the latest Minecraft with Fabric and a performance pack (Sodium, Lithium, Iris). Or build your own profile, or grab a modpack.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" variant="primary" busy={quickBusy} onClick={quickSetup}>
                  {!quickBusy && <Zap size={18} />} Quick setup
                </Button>
                <Button size="lg" variant="secondary" onClick={() => openModal({ kind: 'create-instance' })}>
                  <Plus size={18} /> Custom profile
                </Button>
                <Button size="lg" variant="ghost" onClick={() => openModal({ kind: 'import' })}>
                  <FileUp size={18} /> Import from another launcher
                </Button>
                <Button size="lg" variant="ghost" onClick={() => navigate({ name: 'discover', type: 'modpack' })}>
                  <Compass size={18} /> Browse modpacks
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {instances.length > 0 && (
        <Section title="Jump back in" action={<SeeAll onClick={() => navigate({ name: 'library' })} />}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {instances.slice(0, 5).map((inst) => (
              <InstanceCard key={inst.id} inst={inst} />
            ))}
          </div>
        </Section>
      )}

      {settings.homeSections.popularModpacks && (
      <Section title="Popular modpacks" action={<SeeAll onClick={() => navigate({ name: 'discover', type: 'modpack' })} />}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {(packs ?? Array.from({ length: 5 }, () => null)).map((h, i) =>
            h ? <ProjectTile key={h.project_id} hit={h} onOpen={() => navigate({ name: 'project', id: h.slug })} /> : <div key={i} className="h-52 animate-pulse rounded-2xl bg-surface" />
          )}
          {packs?.length === 0 && <p className="col-span-full text-sm text-muted">Couldn't reach Modrinth.</p>}
        </div>
      </Section>
      )}

      {(settings.homeSections.trendingMods || settings.homeSections.news) && (
      <div className={`grid grid-cols-1 gap-6 [&>*]:min-w-0 ${settings.homeSections.trendingMods && settings.homeSections.news ? 'lg:grid-cols-[1.3fr_1fr]' : ''}`}>
        {settings.homeSections.trendingMods && (
        <Section title="Trending mods" action={<SeeAll onClick={() => navigate({ name: 'discover', type: 'mod' })} />}>
          <div className="rounded-2xl border border-border bg-surface p-2 shadow-soft">
            {(mods ?? []).map((h) => (
              <button
                key={h.project_id}
                onClick={() => navigate({ name: 'project', id: h.slug })}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-raised"
              >
                <ProjectIcon url={h.icon_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{h.title}</div>
                  <div className="truncate text-xs text-muted">{h.description}</div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                  <Download size={12} /> {compact(h.downloads)}
                </span>
              </button>
            ))}
            {mods == null && <div className="h-72 animate-pulse rounded-xl bg-raised/50" />}
          </div>
        </Section>
        )}
        {settings.homeSections.news && (
          <div className={settings.homeSections.trendingMods ? 'pt-9' : ''}>
            <NewsCard />
          </div>
        )}
      </div>
      )}
      <p className="pb-2 text-center text-[11px] text-muted/70">
        Fabric content from Modrinth · Minecraft files always downloaded from Mojang
      </p>
    </div>
  )
}
