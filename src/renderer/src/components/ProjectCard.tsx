import { Check, Download, Heart, RefreshCw } from 'lucide-react'
import type { MrSearchHit } from '@shared/types'
import { compact, timeAgo, titleCase } from '@/lib/format'
import { Button, ProjectIcon } from './ui'

const HIDDEN = new Set(['fabric', 'forge', 'neoforge', 'quilt', 'iris', 'optifine', 'canvas', 'vanilla', 'minecraft', 'datapack'])

export function ProjectCard({
  hit,
  onOpen,
  onInstall,
  installed,
  installing
}: {
  hit: MrSearchHit
  onOpen: () => void
  onInstall: () => void
  installed?: boolean
  installing?: boolean
}) {
  const tags = (hit.display_categories ?? hit.categories).filter((c) => !HIDDEN.has(c)).slice(0, 3)
  const loaders = hit.categories.filter((c) => ['fabric', 'forge', 'neoforge', 'quilt'].includes(c))
  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer gap-4 rounded-2xl border border-border bg-surface p-4 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-[#33404f] hover:bg-raised hover:shadow-lift"
    >
      <ProjectIcon url={hit.icon_url} size={72} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-[15px] font-semibold">{hit.title}</h3>
          <span className="shrink-0 truncate text-xs text-muted">by {hit.author}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{hit.description}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-md bg-bg px-1.5 py-0.5 text-[11px] text-muted">
              {titleCase(t)}
            </span>
          ))}
          {loaders.map((l) => (
            <span key={l} className="rounded-md bg-mint/10 px-1.5 py-0.5 text-[11px] text-mint">
              {titleCase(l)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <div className="flex flex-col items-end gap-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Download size={12} /> {compact(hit.downloads)}
          </span>
          <span className="flex items-center gap-1.5">
            <Heart size={12} /> {compact(hit.follows)}
          </span>
          <span className="flex items-center gap-1.5">
            <RefreshCw size={12} /> {timeAgo(hit.date_modified)}
          </span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {installed ? (
            <Button size="sm" variant="secondary" disabled>
              <Check size={13} /> Installed
            </Button>
          ) : (
            <Button size="sm" variant="primary" busy={installing} onClick={onInstall}>
              {!installing && <Download size={13} />} Install
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Compact vertical card for Home carousels. */
export function ProjectTile({ hit, onOpen }: { hit: MrSearchHit; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-[#33404f] hover:shadow-lift"
    >
      <div className="relative h-24 w-full overflow-hidden bg-raised">
        {hit.featured_gallery && <img src={hit.featured_gallery} alt="" loading="lazy" className="size-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105" />}
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
