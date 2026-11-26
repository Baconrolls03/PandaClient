import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, PackageSearch, X } from 'lucide-react'
import type { Instance, MrCategory, MrGameVersion, MrSearchResult, ProjectType, SearchQuery, SortIndex } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { LOADER_NAMES, titleCase } from '@/lib/format'
import { ProjectCard } from '@/components/ProjectCard'
import { Chip, Empty, InstanceIcon, SearchField, Select, Spinner, Tabs } from '@/components/ui'

const TYPES: { id: ProjectType; label: string }[] = [
  { id: 'mod', label: 'Mods' },
  { id: 'modpack', label: 'Modpacks' },
  { id: 'resourcepack', label: 'Resource packs' },
  { id: 'shader', label: 'Shaders' },
  { id: 'datapack', label: 'Data packs' }
]
const PAGE = 20

function instanceLoaders(inst: Instance): string[] {
  return inst.loader === 'quilt' ? ['quilt', 'fabric'] : inst.loader === 'vanilla' ? [] : [inst.loader]
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

export function Discover({ type, instanceId }: { type: ProjectType; instanceId?: string }) {
  const { navigate, instances, openModal, attempt } = useStore()
  const inst = instanceId && type !== 'modpack' ? instances.find((i) => i.id === instanceId) : undefined
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [sort, setSort] = useState<SortIndex>('relevance')
  const [categories, setCategories] = useState<string[]>([])
  const [loaders, setLoaders] = useState<string[]>([])
  const [gameVersion, setGameVersion] = useState('')
  const [environment, setEnvironment] = useState<SearchQuery['environment']>('client')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<MrSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<MrCategory[]>([])
  const [gameVersions, setGameVersions] = useState<MrGameVersion[]>([])
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [installing, setInstalling] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.modrinth.categories().then(setAllCategories).catch(() => {})
    api.modrinth.gameVersions().then((v) => setGameVersions(v.filter((g) => g.version_type === 'release'))).catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])
  // Reset filters that don't apply when switching type.
  useEffect(() => {
    setCategories([])
    setLoaders([])
    setPage(0)
  }, [type])
  useEffect(() => setPage(0), [debounced, sort, categories, loaders, gameVersion, environment])
  useEffect(() => {
    if (inst) api.content.installedProjects(inst.id).then((ids) => setInstalled(new Set(ids)))
    else setInstalled(new Set())
  }, [inst])

  const q: SearchQuery = useMemo(
    () => ({
      query: debounced,
      type,
      sort,
      categories,
      loaders: inst && type === 'mod' ? instanceLoaders(inst) : type === 'mod' || type === 'modpack' ? loaders : [],
      gameVersions: inst ? [inst.mcVersion] : gameVersion ? [gameVersion] : [],
      environment: type === 'mod' || type === 'datapack' ? environment : null,
      offset: page * PAGE,
      limit: PAGE
    }),
    [debounced, type, sort, categories, loaders, gameVersion, environment, page, inst]
  )

  useEffect(() => {
    let cancelled = false
    setResult(null)
    setError(null)
    api.modrinth
      .search(q)
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(String(e?.message ?? e)))
    return () => {
      cancelled = true
    }
  }, [q])

  const groups = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const c of allCategories.filter((c) => c.project_type === type)) map.set(c.header, [...(map.get(c.header) ?? []), c.name])
    return [...map.entries()]
  }, [allCategories, type])

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const pages = result ? Math.ceil(result.total_hits / PAGE) : 0

  async function install(projectId: string, slug: string, title: string, projectType: string) {
    if (!inst || projectType === 'modpack') return openModal({ kind: 'install', projectId: slug, title, projectType })
    setInstalling((s) => new Set(s).add(projectId))
    const ok = await attempt(async () => {
      await api.content.install(inst.id, projectId)
      return true
    }, `Installed ${title}`)
    setInstalling((s) => {
      const n = new Set(s)
      n.delete(projectId)
      return n
    })
    if (ok) setInstalled((s) => new Set(s).add(projectId))
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
          <p className="mt-1 text-sm text-muted">Thousands of projects from Modrinth, installed in one click.</p>
        </div>
        <Tabs tabs={TYPES} value={type} onChange={(t) => navigate({ name: 'discover', type: t, instanceId })} />
      </div>

      {inst && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue/30 bg-blue/5 px-4 py-3">
          <InstanceIcon url={inst.iconUrl} size={36} />
          <div className="flex-1 text-sm">
            Installing into <span className="font-semibold">{inst.name}</span>
            <span className="text-muted">
              {' '}
              · showing only {LOADER_NAMES[inst.loader]} {inst.mcVersion} compatible results
            </span>
          </div>
          <button aria-label="Clear instance" onClick={() => navigate({ name: 'discover', type })} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-text">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchField value={query} onChange={setQuery} placeholder={`Search ${TYPES.find((t) => t.id === type)!.label.toLowerCase()}`} className="min-w-64 flex-1" />
        <Select
          value={sort}
          onChange={setSort}
          options={[
            { value: 'relevance', label: 'Relevance' },
            { value: 'downloads', label: 'Downloads' },
            { value: 'follows', label: 'Follows' },
            { value: 'newest', label: 'Newest' },
            { value: 'updated', label: 'Recently updated' }
          ]}
        />
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-6">
        {/* Filters */}
        <aside className="flex flex-col gap-6">
          {!inst && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Game version</h3>
              <Select
                value={gameVersion}
                onChange={setGameVersion}
                className="w-full"
                options={[{ value: '', label: 'All versions' }, ...gameVersions.slice(0, 80).map((g) => ({ value: g.version, label: g.version }))]}
              />
            </div>
          )}
          {(type === 'mod' || type === 'modpack') && !inst && (
            <FilterGroup title="Loader">
              {['fabric', 'quilt', 'forge', 'neoforge'].map((l) => (
                <Chip key={l} active={loaders.includes(l)} onClick={() => setLoaders(toggle(loaders, l))}>
                  {LOADER_NAMES[l]}
                </Chip>
              ))}
            </FilterGroup>
          )}
          {type !== 'modpack' && type !== 'shader' && type !== 'resourcepack' && (
            <FilterGroup title="Environment">
              {(['client', 'server'] as const).map((e) => (
                <Chip key={e} active={environment === e} onClick={() => setEnvironment(environment === e ? null : e)}>
                  {titleCase(e)}
                </Chip>
              ))}
            </FilterGroup>
          )}
          {groups.map(([header, names]) => (
            <FilterGroup key={header} title={titleCase(header)}>
              {names.map((n) => (
                <Chip key={n} active={categories.includes(n)} onClick={() => setCategories(toggle(categories, n))}>
                  {titleCase(n)}
                </Chip>
              ))}
            </FilterGroup>
          ))}
        </aside>

        {/* Results */}
        <div className="flex min-w-0 flex-col gap-3">
          {error ? (
            <Empty icon={<PackageSearch size={22} />} title="Couldn't reach Modrinth">
              {error}
            </Empty>
          ) : !result ? (
            <div className="grid place-items-center py-20">
              <Spinner />
            </div>
          ) : result.hits.length === 0 ? (
            <Empty icon={<PackageSearch size={22} />} title="Nothing found">
              Try a different search or fewer filters.
            </Empty>
          ) : (
            <>
              <p className="text-xs text-muted">{result.total_hits.toLocaleString()} results</p>
              {result.hits.map((h) => (
                <ProjectCard
                  key={h.project_id}
                  hit={h}
                  onOpen={() => navigate({ name: 'project', id: h.slug, instanceId: inst?.id })}
                  onInstall={() => install(h.project_id, h.slug, h.title, type)}
                  installed={installed.has(h.project_id)}
                  installing={installing.has(h.project_id)}
                />
              ))}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <button
                    aria-label="Previous page"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                    className="grid size-9 place-items-center rounded-xl bg-surface text-muted transition-colors hover:bg-raised hover:text-text disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm tabular-nums text-muted">
                    Page {page + 1} of {pages.toLocaleString()}
                  </span>
                  <button
                    aria-label="Next page"
                    disabled={page + 1 >= pages}
                    onClick={() => setPage(page + 1)}
                    className="grid size-9 place-items-center rounded-xl bg-surface text-muted transition-colors hover:bg-raised hover:text-text disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
