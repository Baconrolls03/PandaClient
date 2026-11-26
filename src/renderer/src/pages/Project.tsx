import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Bug, Check, Code2, Download, ExternalLink, Heart, HeartHandshake, MessageCircle, Monitor, Server } from 'lucide-react'
import type { MrProject, MrTeamMember, MrVersion } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { compact, LOADER_NAMES, timeAgo, titleCase } from '@/lib/format'
import { Badge, Button, Empty, InstanceIcon, ProjectIcon, Select, Spinner, Tabs } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { Lightbox } from '@/components/Lightbox'
import { CategoryIcon, useCategories } from '@/lib/tags'

type Tab = 'description' | 'gallery' | 'versions'
const HIDDEN = new Set(['fabric', 'forge', 'neoforge', 'quilt', 'iris', 'optifine', 'canvas', 'vanilla', 'minecraft', 'datapack'])

function sideLabel(v: string) {
  return v === 'required' ? 'Required' : v === 'optional' ? 'Optional' : v === 'unsupported' ? 'Not needed' : 'Unknown'
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  )
}

export function Project({ id, instanceId }: { id: string; instanceId?: string }) {
  const { instances, openModal, attempt } = useStore()
  const categories = useCategories()
  const inst = instances.find((i) => i.id === instanceId)
  const [project, setProject] = useState<MrProject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<MrTeamMember[]>([])
  const [versions, setVersions] = useState<MrVersion[] | null>(null)
  const [tab, setTab] = useState<Tab>('description')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [gvFilter, setGvFilter] = useState('')
  const [loaderFilter, setLoaderFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setProject(null)
    setVersions(null)
    setTab('description')
    api.modrinth.project(id).then(setProject).catch((e) => setError(String(e?.message ?? e)))
    api.modrinth.members(id).then(setMembers).catch(() => {})
    api.modrinth.versions(id).then(setVersions).catch(() => setVersions([]))
  }, [id])
  useEffect(() => {
    if (inst && project) api.content.installedProjects(inst.id).then((ids) => setInstalled(ids.includes(project.id)))
  }, [inst, project])
  useEffect(() => {
    if (inst) setGvFilter(inst.mcVersion)
  }, [inst])
  useEffect(() => {
    if (project) setLoaderFilter(project.project_type === 'mod' || project.project_type === 'modpack' ? 'fabric' : '')
  }, [project])

  const filtered = useMemo(
    () => (versions ?? []).filter((v) => (!gvFilter || v.game_versions.includes(gvFilter)) && (!loaderFilter || v.loaders.includes(loaderFilter))),
    [versions, gvFilter, loaderFilter]
  )

  if (error) return <div className="p-8"><Empty icon={<Bug size={22} />} title="Couldn't load this project">{error}</Empty></div>
  if (!project) return <div className="grid h-full place-items-center"><Spinner /></div>

  const isPack = project.project_type === 'modpack'
  // Fabric-only launcher: mods and modpacks need a Fabric version (data-pack mods can still go in as data packs).
  const noFabric = (project.project_type === 'mod' || isPack) && !project.loaders.includes('fabric') && !project.loaders.includes('datapack')
  const allGv = [...new Set((versions ?? []).flatMap((v) => v.game_versions))]
  const allLoaders = [...new Set((versions ?? []).flatMap((v) => v.loaders))]
  const releaseVersions = project.game_versions.filter((v) => /^\d+(\.\d+)+$/.test(v)).reverse()

  async function install(version?: MrVersion) {
    if (!project) return
    if (isPack) {
      if (!version) return openModal({ kind: 'install', projectId: project.id, title: project.title, projectType: project.project_type })
      setInstalling(version.id)
      await attempt(() => api.modrinth.installModpack(project.id, version.id), `${project.title} installed`)
      return setInstalling(null)
    }
    if (!inst) return openModal({ kind: 'install', projectId: project.id, title: project.title, projectType: project.project_type })
    setInstalling(version?.id ?? 'best')
    const ok = await attempt(async () => {
      await api.content.install(inst.id, project.id, version?.id)
      return true
    }, `Installed ${project.title} into ${inst.name}`)
    setInstalling(null)
    if (ok) setInstalled(true)
  }

  const links = [
    { url: project.source_url, label: 'Source', icon: <Code2 size={15} /> },
    { url: project.issues_url, label: 'Issues', icon: <Bug size={15} /> },
    { url: project.wiki_url, label: 'Wiki', icon: <BookOpen size={15} /> },
    { url: project.discord_url, label: 'Discord', icon: <MessageCircle size={15} /> },
    ...(project.donation_urls ?? []).map((d) => ({ url: d.url, label: d.platform, icon: <HeartHandshake size={15} /> }))
  ].filter((l) => l.url)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-soft">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-mint/8 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-6">
          <ProjectIcon url={project.icon_url} size={96} className="rounded-2xl shadow-lift" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
              <Badge tone="blue">{titleCase(project.project_type)}</Badge>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm text-muted">{project.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1.5"><Download size={14} /> {compact(project.downloads)} downloads</span>
              <span className="flex items-center gap-1.5"><Heart size={14} /> {compact(project.followers)} followers</span>
              <span>Updated {timeAgo(project.updated)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[...project.categories, ...(project.additional_categories ?? [])].filter((c) => !HIDDEN.has(c)).map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg/60 px-2 py-0.5 text-xs text-muted">
                  <CategoryIcon name={c} categories={categories} className="size-3" />
                  {titleCase(c)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {noFabric ? (
              <Button size="lg" variant="secondary" disabled>Not available for Fabric</Button>
            ) : installed ? (
              <Button size="lg" variant="secondary" disabled><Check size={18} /> Installed</Button>
            ) : (
              <Button size="lg" variant="primary" busy={installing === 'best'} onClick={() => install()}>
                {installing !== 'best' && <Download size={18} />} {isPack ? 'Install modpack' : 'Install'}
              </Button>
            )}
            {inst && !isPack && (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                into <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={16} className="rounded" /> {inst.name}
              </span>
            )}
          </div>
        </div>
      </section>

      <Tabs
        tabs={[
          { id: 'description' as Tab, label: 'Description' },
          { id: 'gallery' as Tab, label: 'Gallery', count: project.gallery.length },
          { id: 'versions' as Tab, label: 'Versions', count: versions?.length }
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {tab === 'description' && (
            <div className="rounded-2xl border border-border bg-surface p-7 shadow-soft">
              <Markdown source={project.body} />
            </div>
          )}

          {tab === 'gallery' &&
            (project.gallery.length === 0 ? (
              <Empty icon={<Monitor size={22} />} title="No images yet" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[...project.gallery].sort((a, b) => a.ordering - b.ordering).map((g, i) => (
                  <button key={g.url} onClick={() => setLightbox(i)} className="group overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                    <img src={g.url} alt="" loading="lazy" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    {(g.title || g.description) && (
                      <div className="p-3">
                        <div className="text-sm font-medium">{g.title}</div>
                        {g.description && <div className="mt-0.5 text-xs text-muted">{g.description}</div>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}

          {tab === 'versions' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Select value={gvFilter} onChange={setGvFilter} options={[{ value: '', label: 'All game versions' }, ...allGv.map((g) => ({ value: g, label: g }))]} />
                <Select value={loaderFilter} onChange={setLoaderFilter} options={[{ value: '', label: 'All loaders' }, ...allLoaders.map((l) => ({ value: l, label: LOADER_NAMES[l] ?? titleCase(l) }))]} />
                <span className="ml-auto self-center text-xs text-muted">{filtered.length} version{filtered.length === 1 ? '' : 's'}</span>
              </div>
              {versions == null ? (
                <div className="grid place-items-center py-10"><Spinner /></div>
              ) : filtered.length === 0 ? (
                <Empty icon={<Download size={22} />} title="No matching versions">Try another game version or loader.</Empty>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
                  {filtered.slice(0, 100).map((v) => (
                    <div key={v.id} className="border-b border-border last:border-0">
                      <div className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-raised" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
                        <Badge tone={v.version_type === 'release' ? 'mint' : v.version_type === 'beta' ? 'amber' : 'danger'}>{v.version_type[0].toUpperCase()}</Badge>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{v.name}</div>
                          <div className="truncate text-xs text-muted">{v.version_number}</div>
                        </div>
                        <div className="hidden w-28 truncate text-xs text-muted lg:block">
                          {v.loaders.map((l) => LOADER_NAMES[l] ?? titleCase(l)).join(', ')}
                        </div>
                        <div className="hidden w-24 truncate text-xs text-muted lg:block">
                          {v.game_versions.slice(0, 3).join(', ')}{v.game_versions.length > 3 ? ` +${v.game_versions.length - 3}` : ''}
                        </div>
                        <div className="w-20 text-right text-xs text-muted">{timeAgo(v.date_published)}</div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="secondary" busy={installing === v.id} onClick={() => install(v)}>Install</Button>
                        </div>
                      </div>
                      {expanded === v.id && (
                        <div className="animate-pop border-t border-border bg-bg/50 px-6 py-4">
                          {v.changelog ? <Markdown source={v.changelog} className="text-sm" /> : <p className="text-sm text-muted">No changelog.</p>}
                          <p className="mt-3 text-xs text-muted">
                            {v.files.find((f) => f.primary)?.filename ?? v.files[0]?.filename} · {compact(v.downloads)} downloads
                            {v.dependencies.some((d) => d.dependency_type === 'required') && ` · ${v.dependencies.filter((d) => d.dependency_type === 'required').length} required dependencies (installed automatically)`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <SideCard title="Compatibility">
            <div className="text-xs text-muted">Minecraft</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {releaseVersions.slice(0, 10).map((v) => <span key={v} className="rounded-md bg-bg px-1.5 py-0.5 text-[11px]">{v}</span>)}
              {releaseVersions.length > 10 && <span className="px-1 text-[11px] text-muted">+{releaseVersions.length - 10} more</span>}
            </div>
            {project.loaders.length > 0 && (
              <>
                <div className="mt-4 text-xs text-muted">Platforms</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {project.loaders.map((l) => <Badge key={l} tone="mint">{LOADER_NAMES[l] ?? titleCase(l)}</Badge>)}
                </div>
              </>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted"><Monitor size={13} /> Client: <span className="text-text">{sideLabel(project.client_side)}</span></div>
              <div className="flex items-center gap-1.5 text-muted"><Server size={13} /> Server: <span className="text-text">{sideLabel(project.server_side)}</span></div>
            </div>
          </SideCard>
          {links.length > 0 && (
            <SideCard title="Links">
              <div className="flex flex-col gap-0.5">
                {links.map((l) => (
                  <button key={l.label} onClick={() => api.system.openExternal(l.url!)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-raised hover:text-text">
                    {l.icon} {l.label} <ExternalLink size={12} className="ml-auto opacity-50" />
                  </button>
                ))}
              </div>
            </SideCard>
          )}
          {members.length > 0 && (
            <SideCard title="Creators">
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <div key={m.user.username} className="flex items-center gap-2.5">
                    <ProjectIcon url={m.user.avatar_url} size={30} className="rounded-full" />
                    <div>
                      <div className="text-sm font-medium">{m.user.username}</div>
                      <div className="text-[11px] text-muted">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SideCard>
          )}
          <SideCard title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              {project.license && <><dt className="text-muted">License</dt><dd className="truncate">{project.license.name || project.license.id}</dd></>}
              <dt className="text-muted">Published</dt><dd>{timeAgo(project.published)}</dd>
              <dt className="text-muted">Updated</dt><dd>{timeAgo(project.updated)}</dd>
            </dl>
            <button onClick={() => api.system.openExternal(`https://modrinth.com/${project.project_type}/${project.slug}`)} className="mt-3 flex items-center gap-1.5 text-xs text-blue hover:underline">
              View on Modrinth <ExternalLink size={11} />
            </button>
          </SideCard>
        </aside>
      </div>

      {lightbox != null && (
        <Lightbox images={[...project.gallery].sort((a, b) => a.ordering - b.ordering)} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}
