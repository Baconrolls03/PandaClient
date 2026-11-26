import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Gamepad2, Lock, LockOpen, Monitor, PackageSearch, Search, Server, Tag, X } from 'lucide-react'
import type { MrGameVersion, MrSearchResult, ProjectType, SearchQuery, SortIndex } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { titleCase } from '@/lib/format'
import { CategoryIcon, useCategories } from '@/lib/tags'
import { ProjectCard } from '@/components/ProjectCard'
import { Empty, InstanceIcon, Select, Spinner, Toggle } from '@/components/ui'

const TYPES: { id: ProjectType; label: string }[] = [
  { id: 'mod', label: 'Mods' },
  { id: 'modpack', label: 'Modpacks' },
  { id: 'resourcepack', label: 'Resource Packs' },
  { id: 'datapack', label: 'Data Packs' },
  { id: 'shader', label: 'Shaders' }
]
const PAGE_SIZES = [5, 10, 20, 50, 100]

/** Everything Discover shows must run on Fabric: Fabric mods and modpacks, Iris shaders. */
function loadersFor(type: ProjectType): string[] {
  return type === 'mod' || type === 'modpack' ? ['fabric'] : type === 'shader' ? ['iris'] : []
}

/** 1 2 … 946 style page list. */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const set = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total))
  if (current <= 2) [1, 2, 3].forEach((p) => set.add(p))
  if (current >= total - 3) [total - 2, total - 3, total - 4].forEach((p) => set.add(p))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  const btn = 'grid h-8 min-w-8 place-items-center rounded-full px-2 text-sm font-semibold transition-colors'
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)} className={`${btn} text-muted hover:bg-raised hover:text-text disabled:opacity-30`}>
        <ChevronLeft size={16} />
      </button>
      {pageList(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <button key={p} onClick={() => onPage(p)} className={`${btn} ${p === page ? 'bg-mint text-ink' : 'text-muted hover:bg-raised hover:text-text'}`}>
            {(p + 1).toLocaleString()}
          </button>
        )
      )}
      <button aria-label="Next page" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className={`${btn} text-muted hover:bg-raised hover:text-text disabled:opacity-30`}>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-border/70 py-4 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-bold">
        {title}
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  )
}

function FilterRow({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-raised ${active ? 'font-semibold text-mint' : 'text-muted hover:text-text'}`}
    >
      <span className="grid size-4 place-items-center">{icon}</span>
      <span className="flex-1">{children}</span>
      {active && <Check size={14} />}
    </button>
  )
}

function LockedFilter({ value, note, onUnlock }: { value: string; note: string; onUnlock?: () => void }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-raised px-2 py-0.5 text-xs font-semibold">{value}</span>
      <div className="mt-3 rounded-xl border border-border bg-bg/60 p-3">
        <p className="text-[13px] font-semibold">{note}</p>
        {onUnlock && <p className="mt-1 text-xs text-muted">Unlocking this filter may let you install content that doesn't work with this instance.</p>}
        {onUnlock && (
          <button onClick={onUnlock} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-raised px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-border">
            <LockOpen size={13} /> Unlock filter
          </button>
        )}
      </div>
    </>
  )
}

export function Discover({ type, instanceId }: { type: ProjectType; instanceId?: string }) {
  const { navigate, instances, openModal, attempt, back } = useStore()
  const inst = instanceId ? instances.find((i) => i.id === instanceId) : undefined
  const categories = useCategories()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [sort, setSort] = useState<SortIndex>('relevance')
  const [pageSize, setPageSize] = useState(20)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [versions, setVersions] = useState<string[]>([])
  const [versionSearch, setVersionSearch] = useState('')
  const [allVersions, setAllVersions] = useState(false)
  const [gvUnlocked, setGvUnlocked] = useState(false)
  const [environment, setEnvironment] = useState<SearchQuery['environment']>(null)
  const [hideInstalled, setHideInstalled] = useState(false)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<MrSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gameVersions, setGameVersions] = useState<MrGameVersion[]>([])
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [installing, setInstalling] = useState<Set<string>>(new Set())

  const types = inst ? TYPES.filter((t) => t.id !== 'modpack') : TYPES
  const gvLocked = Boolean(inst) && !gvUnlocked

  useEffect(() => {
    api.modrinth.gameVersions().then(setGameVersions).catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => {
    setSelectedCats([])
    setEnvironment(null)
    setPage(0)
  }, [type])
  useEffect(() => setPage(0), [debounced, sort, selectedCats, versions, environment, pageSize, gvUnlocked])
  useEffect(() => {
    if (inst) api.content.installedProjects(inst.id).then((ids) => setInstalled(new Set(ids)))
    else setInstalled(new Set())
  }, [inst])

  const q: SearchQuery = useMemo(
    () => ({
      query: debounced,
      type,
      sort,
      categories: selectedCats,
      loaders: loadersFor(type),
      gameVersions: gvLocked && inst ? [inst.mcVersion] : versions,
      environment: type === 'mod' || type === 'datapack' ? environment : null,
      offset: page * pageSize,
      limit: pageSize
    }),
    [debounced, type, sort, selectedCats, gvLocked, inst, versions, environment, page, pageSize]
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

  // Data packs share the mod category list on Modrinth.
  const catType = type === 'datapack' ? 'mod' : type
  const groups = useMemo(() => {
    const map = new Map<string, typeof categories>()
    for (const c of categories.filter((c) => c.project_type === catType)) map.set(c.header, [...(map.get(c.header) ?? []), c])
    // Resolutions read best smallest-first (16x, 32x… not 128x, 16x).
    const res = map.get('resolutions')
    if (res) map.set('resolutions', [...res].sort((a, b) => parseInt(a.name) - parseInt(b.name)))
    return [...map.entries()]
  }, [categories, catType])

  const versionOptions = useMemo(
    () =>
      gameVersions
        .filter((g) => (allVersions || g.version_type === 'release') && g.version.includes(versionSearch.trim()))
        .slice(0, 200),
    [gameVersions, allVersions, versionSearch]
  )

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const pages = result ? Math.ceil(result.total_hits / pageSize) : 0
  const hits = (result?.hits ?? []).filter((h) => !(hideInstalled && installed.has(h.project_id)))

  async function install(projectId: string, slug: string, title: string, projectType: string) {
    if (!inst || projectType === 'modpack' || type === 'modpack') return openModal({ kind: 'install', projectId: slug, title, projectType: type === 'modpack' ? 'modpack' : projectType })
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

  const activeChips = [
    ...(gvLocked && inst ? [{ key: 'gv', label: inst.mcVersion, locked: true, icon: <Lock size={11} /> }] : versions.map((v) => ({ key: `v:${v}`, label: v, locked: false, icon: <Gamepad2 size={11} /> }))),
    ...(type === 'mod' || type === 'modpack' ? [{ key: 'fabric', label: 'Fabric', locked: true, icon: <Lock size={11} /> }] : []),
    ...(type === 'shader' ? [{ key: 'iris', label: 'Iris', locked: true, icon: <Lock size={11} /> }] : []),
    ...(environment ? [{ key: 'env', label: titleCase(environment), locked: false, icon: null }] : []),
    ...selectedCats.map((c) => ({ key: `c:${c}`, label: titleCase(c), locked: false, icon: <CategoryIcon name={c} categories={categories} className="size-3" /> }))
  ]
  const removeChip = (key: string) => {
    if (key === 'env') setEnvironment(null)
    else if (key.startsWith('v:')) setVersions(versions.filter((v) => v !== key.slice(2)))
    else if (key.startsWith('c:')) setSelectedCats(selectedCats.filter((c) => c !== key.slice(2)))
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[1fr_280px] gap-6 p-8">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Header */}
        {inst ? (
          <div className="flex items-center gap-4">
            <button aria-label="Back" onClick={back} className="grid size-10 place-items-center rounded-xl bg-surface text-muted transition-colors hover:bg-raised hover:text-text">
              <ArrowLeft size={18} />
            </button>
            <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={48} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">{inst.name}</h1>
              <p className="flex items-center gap-2 text-sm text-muted">
                Installing content <span>·</span>
                <Gamepad2 size={14} /> Minecraft {inst.mcVersion} <span>·</span>
                <Tag size={13} /> Fabric
              </p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
            <p className="mt-1 text-sm text-muted">Everything on Modrinth that runs on Fabric, installed in one click.</p>
          </div>
        )}

        {/* Type tabs */}
        <div className="flex w-fit gap-1 rounded-full bg-surface p-1">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate({ name: 'discover', type: t.id, instanceId })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${type === t.id ? 'bg-mint text-ink shadow-mint' : 'text-muted hover:text-text'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-surface px-4 transition-colors focus-within:border-blue/60">
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${types.find((t) => t.id === type)?.label.toLowerCase() ?? ''}...`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery('')} className="text-muted hover:text-text">
              <X size={15} />
            </button>
          )}
        </label>

        {/* Sort / view / pages */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sort}
            onChange={setSort}
            options={[
              { value: 'relevance', label: 'Sort by: Relevance' },
              { value: 'downloads', label: 'Sort by: Downloads' },
              { value: 'follows', label: 'Sort by: Follows' },
              { value: 'newest', label: 'Sort by: Newest' },
              { value: 'updated', label: 'Sort by: Updated' }
            ]}
          />
          <Select value={String(pageSize)} onChange={(v) => setPageSize(Number(v))} options={PAGE_SIZES.map((n) => ({ value: String(n), label: `View: ${n}` }))} />
          <div className="ml-auto">
            <Pagination page={page} pages={pages} onPage={setPage} />
          </div>
        </div>

        {/* Active filters */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-muted">
                {c.icon}
                {c.label}
                {!c.locked && (
                  <button aria-label={`Remove ${c.label}`} onClick={() => removeChip(c.key)} className="hover:text-text">
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {activeChips.some((c) => !c.locked) && (
              <button
                onClick={() => {
                  setSelectedCats([])
                  setVersions([])
                  setEnvironment(null)
                }}
                className="ml-1 text-xs font-medium text-muted hover:text-mint"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {error ? (
          <Empty icon={<PackageSearch size={22} />} title="Couldn't reach Modrinth">
            {error}
          </Empty>
        ) : !result ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[136px] animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : hits.length === 0 ? (
          <Empty icon={<PackageSearch size={22} />} title="Nothing found">
            Try a different search or fewer filters.
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {hits.map((h) => (
              <ProjectCard
                key={h.project_id}
                hit={h}
                categories={categories}
                onOpen={() => navigate({ name: 'project', id: h.slug, instanceId: inst?.id })}
                onInstall={() => install(h.project_id, h.slug, h.title, h.project_type)}
                installed={installed.has(h.project_id)}
                installing={installing.has(h.project_id)}
              />
            ))}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted">{result.total_hits.toLocaleString()} results</span>
              <Pagination page={page} pages={pages} onPage={setPage} />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <aside className="sticky top-0 max-h-[calc(100vh-11rem)] self-start overflow-y-auto rounded-2xl border border-border bg-surface px-4 shadow-soft">
        {inst && (
          <div className="flex items-center justify-between gap-3 border-b border-border/70 py-4">
            <span className="text-sm font-bold">Hide content already installed</span>
            <Toggle label="Hide installed" checked={hideInstalled} onChange={setHideInstalled} />
          </div>
        )}

        <Section title="Game version">
          {gvLocked && inst ? (
            <LockedFilter value={inst.mcVersion} note="Game version is provided by the instance" onUnlock={() => setGvUnlocked(true)} />
          ) : (
            <>
              <label className="mb-2 flex h-8 items-center gap-2 rounded-lg bg-bg px-2.5">
                <Search size={13} className="text-muted" />
                <input value={versionSearch} onChange={(e) => setVersionSearch(e.target.value)} placeholder="Search versions" className="w-full bg-transparent text-xs outline-none placeholder:text-muted" />
              </label>
              <div className="max-h-56 overflow-y-auto">
                {versionOptions.map((g) => (
                  <FilterRow key={g.version} active={versions.includes(g.version)} onClick={() => setVersions(toggle(versions, g.version))}>
                    {g.version}
                  </FilterRow>
                ))}
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 px-2 text-xs text-muted">
                <input type="checkbox" checked={allVersions} onChange={(e) => setAllVersions(e.target.checked)} className="accent-mint" /> Show all versions
              </label>
              {inst && (
                <button onClick={() => setGvUnlocked(false)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-raised px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-border">
                  <Lock size={13} /> Lock to {inst.mcVersion}
                </button>
              )}
            </>
          )}
        </Section>

        {(type === 'mod' || type === 'modpack') && (
          <Section title="Loader">
            <LockedFilter value="Fabric" note="PandaClient runs Fabric, so only Fabric content is shown" />
          </Section>
        )}
        {type === 'shader' && (
          <Section title="Loader">
            <LockedFilter value="Iris" note="Shaders run through Iris, which comes with the performance pack" />
          </Section>
        )}

        {(type === 'mod' || type === 'datapack') && (
          <Section title="Environment">
            {(['client', 'server'] as const).map((e) => (
              <FilterRow key={e} active={environment === e} onClick={() => setEnvironment(environment === e ? null : e)} icon={e === 'client' ? <Monitor size={14} /> : <Server size={14} />}>
                {titleCase(e)}
              </FilterRow>
            ))}
          </Section>
        )}

        {groups.map(([header, list]) => (
          <Section key={header} title={titleCase(header)}>
            {list.map((c) => (
              <FilterRow key={c.name} active={selectedCats.includes(c.name)} onClick={() => setSelectedCats(toggle(selectedCats, c.name))} icon={<CategoryIcon name={c.name} categories={categories} />}>
                {titleCase(c.name)}
              </FilterRow>
            ))}
          </Section>
        ))}
        {groups.length === 0 && <div className="py-6 text-center"><Spinner /></div>}
      </aside>
    </div>
  )
}
