import { Check, Download, Globe, Heart, History, Loader2, Monitor, Plus, Server } from 'lucide-react'
import type { MrCategory, MrSearchHit } from '@shared/types'
import { compact, timeAgo, titleCase } from '@/lib/format'
import { CategoryIcon } from '@/lib/tags'
import { ProjectIcon } from './ui'

const NOT_CATEGORIES = new Set(['fabric', 'forge', 'neoforge', 'quilt', 'iris', 'optifine', 'canvas', 'vanilla', 'minecraft', 'datapack', 'liteloader', 'modloader', 'rift', 'babric', 'legacy-fabric', 'ornithe', 'nilloader', 'bta-babric', 'java-agent'])
const supported = (side?: string) => side === 'required' || side === 'optional'

/** "Client", "Server", "Client or server"… the way Modrinth labels where a project runs. */
export function environmentOf(client?: string, server?: string): { label: string; icon: React.ReactNode } | null {
  const c = supported(client)
  const s = supported(server)
  if (c && !s) return { label: 'Client', icon: <Monitor size={12} /> }
  if (s && !c) return { label: 'Server', icon: <Server size={12} /> }
  if (c && s) return { label: client === 'required' && server === 'required' ? 'Client and server' : 'Client or server', icon: <Globe size={12} /> }
  return null
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg/60 px-2 py-0.5 text-[11.5px] text-muted">{children}</span>
}

export function InstallButton({ installed, installing, onClick, label = 'Install' }: { installed?: boolean; installing?: boolean; onClick: () => void; label?: string }) {
  if (installed)
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-mint/30 px-3 text-xs font-semibold text-mint/80">
        <Check size={14} /> Installed
      </span>
    )
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={installing}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-mint/60 px-3 text-xs font-semibold text-mint transition-all hover:-translate-y-px hover:bg-mint hover:text-ink disabled:pointer-events-none disabled:opacity-70"
    >
      {installing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
      {installing ? 'Installing' : label}
    </button>
  )
}

export function ProjectCard({
  hit,
  categories,
  onOpen,
  onInstall,
  installed,
  installing
}: {
  hit: MrSearchHit
  categories: MrCategory[]
  onOpen: () => void
  onInstall: () => void
  installed?: boolean
  installing?: boolean
}) {
  const cats = (hit.display_categories ?? hit.categories).filter((c) => !NOT_CATEGORIES.has(c))
  const env = hit.project_type === 'mod' || hit.project_type === 'modpack' ? environmentOf(hit.client_side, hit.server_side) : null
  const shown = cats.slice(0, env ? 2 : 3)
  return (
    <div
      onClick={onOpen}
      className="group grid cursor-pointer grid-cols-[88px_1fr_auto] gap-x-5 rounded-2xl border border-border bg-surface p-4 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:bg-raised hover:shadow-lift"
    >
      <ProjectIcon url={hit.icon_url} size={88} className="row-span-2 rounded-2xl" />
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="truncate text-[17px] font-bold tracking-tight">{hit.title}</h3>
          <span className="shrink-0 truncate text-sm text-muted">by {hit.author}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-muted">{hit.description}</p>
      </div>
      <div className="flex justify-end">
        <InstallButton installed={installed} installing={installing} onClick={onInstall} />
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 self-end">
        {env && (
          <Tag>
            {env.icon} {env.label}
          </Tag>
        )}
        {shown.map((c) => (
          <Tag key={c}>
            <CategoryIcon name={c} categories={categories} className="size-3" />
            {titleCase(c)}
          </Tag>
        ))}
        {cats.length > shown.length && <Tag>+{cats.length - shown.length}</Tag>}
      </div>
      <div className="mt-3 flex flex-col items-end justify-end gap-1 text-[13px] text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5" title="Downloads">
            <Download size={14} /> <span className="font-semibold text-text/90">{compact(hit.downloads)}</span>
          </span>
          <span className="flex items-center gap-1.5" title="Followers">
            <Heart size={14} /> <span className="font-semibold text-text/90">{compact(hit.follows)}</span>
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-xs" title="Last updated">
          <History size={13} /> {timeAgo(hit.date_modified)}
        </span>
      </div>
    </div>
  )
}

/** Compact vertical card for Home carousels. */
export function ProjectTile({ hit, onOpen }: { hit: MrSearchHit; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
    >
      <div className="relative h-24 w-full overflow-hidden bg-raised">
        {hit.featured_gallery ? (
          <img src={hit.featured_gallery} alt="" loading="lazy" className="size-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105" />
        ) : hit.icon_url ? (
          // No banner image: use a blurred, zoomed icon so the tile still has colour.
          <img src={hit.icon_url} alt="" loading="lazy" className="size-full scale-150 object-cover opacity-50 blur-xl" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
      </div>
      <div className="-mt-8 flex flex-1 flex-col px-4 pb-4">
        <ProjectIcon url={hit.icon_url} size={48} className="relative ring-4 ring-surface" />
        <h3 className="mt-2 truncate text-sm font-semibold">{hit.title}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{hit.description}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted">
          <Download size={12} /> {compact(hit.downloads)}
        </span>
      </div>
    </button>
  )
}
