import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpCircle, FilePlus, Package, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { CONTENT_FOLDERS, type ContentItem, type ContentType, type Instance, type ProjectType } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { bytes } from '@/lib/format'
import { Badge, Button, Chip, ConfirmIconButton, Empty, ProjectIcon, SearchField, Spinner, Toggle } from '@/components/ui'

const TYPE_LABEL: Record<ContentType, string> = { mod: 'Mods', resourcepack: 'Resource packs', shader: 'Shaders', datapack: 'Data packs' }
const TO_PROJECT: Record<ContentType, ProjectType> = { mod: 'mod', resourcepack: 'resourcepack', shader: 'shader', datapack: 'datapack' }

export function ContentTab({ inst }: { inst: Instance }) {
  const { navigate, attempt, tasks, toast } = useStore()
  const [items, setItems] = useState<ContentItem[] | null>(null)
  const [filter, setFilter] = useState<ContentType | 'all'>('all')
  const [q, setQ] = useState('')
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(() => api.content.list(inst.id).then(setItems).catch(() => setItems([])), [inst.id])
  useEffect(() => {
    load()
  }, [load])
  // Refresh when an install for this instance finishes.
  const doneCount = tasks.filter((t) => t.instanceId === inst.id && t.status === 'done').length
  useEffect(() => {
    if (doneCount) load()
  }, [doneCount, load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items?.length ?? 0 }
    for (const i of items ?? []) c[i.type] = (c[i.type] ?? 0) + 1
    return c
  }, [items])
  const shown = (items ?? []).filter((i) => (filter === 'all' || i.type === filter) && `${i.project?.title ?? ''} ${i.file}`.toLowerCase().includes(q.toLowerCase()))
  const updates = (items ?? []).filter((i) => i.update)

  async function checkUpdates() {
    setChecking(true)
    const r = await attempt(() => api.content.checkUpdates(inst.id))
    setChecking(false)
    if (r) {
      setItems(r)
      const n = r.filter((i) => i.update).length
      toast(n ? `${n} update${n === 1 ? '' : 's'} available` : 'Everything is up to date', n ? 'info' : 'success')
    }
  }

  async function updateItems(list: ContentItem[]) {
    setUpdating(true)
    await attempt(() => api.content.update(inst.id, list.map((i) => ({ file: i.file, type: i.type }))), `Updated ${list.length} item${list.length === 1 ? '' : 's'}`)
    setUpdating(false)
    load()
  }

  async function addFile() {
    const type = filter === 'all' ? 'mod' : filter
    const file = await api.settings.pickFile('content')
    if (!file) return
    await attempt(() => api.content.addFile(inst.id, file, type), `Added to ${CONTENT_FOLDERS[type]}`)
    load()
  }

  const discoverType: ProjectType = filter === 'all' ? 'mod' : TO_PROJECT[filter]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={q} onChange={setQ} placeholder="Search content" className="w-64" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            All {counts.all ? `(${counts.all})` : ''}
          </Chip>
          {(Object.keys(TYPE_LABEL) as ContentType[]).map((t) =>
            counts[t] ? (
              <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
                {TYPE_LABEL[t]} ({counts[t]})
              </Chip>
            ) : null
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {updates.length > 0 && (
            <Button variant="blue" busy={updating} onClick={() => updateItems(updates)}>
              {!updating && <ArrowUpCircle size={16} />} Update all ({updates.length})
            </Button>
          )}
          <Button variant="ghost" busy={checking} onClick={checkUpdates} title="Check Modrinth for updates">
            {!checking && <RefreshCw size={15} />} Check updates
          </Button>
          <Button variant="secondary" onClick={addFile} title="Add a file from your computer">
            <FilePlus size={16} />
          </Button>
          <Button variant="primary" onClick={() => navigate({ name: 'discover', type: discoverType, instanceId: inst.id })}>
            <Plus size={16} /> Add content
          </Button>
        </div>
      </div>

      {items == null ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <Empty
          icon={<Package size={22} />}
          title="No content yet"
          action={
            <Button variant="primary" onClick={() => navigate({ name: 'discover', type: discoverType, instanceId: inst.id })}>
              <Plus size={16} /> Browse Modrinth
            </Button>
          }
        >
          Add Fabric mods, resource packs, shaders and data packs.
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="grid grid-cols-[auto_1fr_140px_80px_auto] items-center gap-4 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span className="w-11" />
            <span>Name</span>
            <span>Version</span>
            <span className="text-right">Size</span>
            <span className="w-[116px]" />
          </div>
          {shown.map((i) => (
            <div key={`${i.type}/${i.file}`} className={`group grid grid-cols-[auto_1fr_140px_80px_auto] items-center gap-4 border-b border-border px-4 py-2.5 last:border-0 transition-colors hover:bg-raised ${i.enabled ? '' : 'opacity-55'}`}>
              <Toggle
                label={i.enabled ? 'Disable' : 'Enable'}
                checked={i.enabled}
                onChange={async () => {
                  await attempt(() => api.content.toggle(inst.id, i.file, i.type))
                  load()
                }}
              />
              <button
                className="flex min-w-0 items-center gap-3 text-left"
                disabled={!i.project}
                onClick={() => i.project && navigate({ name: 'project', id: i.project.slug, instanceId: inst.id })}
              >
                <ProjectIcon url={i.project?.iconUrl} size={36} className="rounded-lg" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{i.project?.title ?? i.file.replace(/\.disabled$/, '')}</div>
                  <div className="flex items-center gap-1.5 truncate text-xs text-muted">
                    {filter === 'all' && <span>{TYPE_LABEL[i.type].replace(/s$/, '')} ·</span>}
                    <span className="truncate">{i.file}</span>
                  </div>
                </div>
              </button>
              <div className="min-w-0">
                {i.update ? (
                  <button onClick={() => updateItems([i])} className="flex items-center gap-1 truncate text-xs text-blue hover:underline" title={`Update to ${i.update.number}`}>
                    <ArrowUpCircle size={13} /> {i.update.number}
                  </button>
                ) : (
                  <span className="block truncate text-xs text-muted">{i.version?.number ?? <Badge>Local file</Badge>}</span>
                )}
              </div>
              <span className="text-right text-xs tabular-nums text-muted">{bytes(i.size)}</span>
              <div className="flex w-[116px] justify-end gap-1">
                <ConfirmIconButton
                  label="Remove"
                  onConfirm={async () => {
                    await attempt(() => api.content.remove(inst.id, i.file, i.type))
                    load()
                  }}
                >
                  <Trash2 size={15} />
                </ConfirmIconButton>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No matches.</p>}
        </div>
      )}
      {filter === 'datapack' && (
        <p className="text-xs text-muted">Data packs go in the instance's datapacks folder. Copy them into a world's datapacks folder, or use a global data pack mod.</p>
      )}
    </div>
  )
}
