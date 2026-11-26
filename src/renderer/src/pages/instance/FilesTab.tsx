import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, ExternalLink, File, FileText, Folder, Home, Trash2 } from 'lucide-react'
import type { FileEntry, Instance } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { bytes, timeAgo } from '@/lib/format'
import { Button, ConfirmIconButton, IconButton, Modal, Spinner } from '@/components/ui'

const TEXT = /\.(txt|json5?|toml|properties|cfg|conf|ya?ml|ini|log|md|mcmeta|snbt|csv)$|^[^.]+$/i

export function FilesTab({ inst }: { inst: Instance }) {
  const { attempt } = useStore()
  const [dir, setDir] = useState('')
  const [entries, setEntries] = useState<FileEntry[] | null>(null)
  const [editing, setEditing] = useState<{ path: string; text: string; original: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setEntries(null)
    api.files.list(inst.id, dir).then(setEntries).catch(() => setEntries([]))
  }, [inst.id, dir])
  useEffect(load, [load])

  const crumbs = dir ? dir.split('/') : []

  async function open(e: FileEntry) {
    if (e.dir) return setDir(e.path)
    if (!TEXT.test(e.name)) return api.files.reveal(inst.id, e.path)
    const text = await attempt(() => api.files.read(inst.id, e.path))
    if (text != null) setEditing({ path: e.path, text, original: text })
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    const ok = await attempt(async () => {
      await api.files.write(inst.id, editing.path, editing.text)
      return true
    }, 'Saved')
    setSaving(false)
    if (ok) setEditing(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 text-sm">
        <button onClick={() => setDir('')} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-muted transition-colors hover:bg-raised hover:text-text">
          <Home size={14} /> {inst.name}
        </button>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-muted" />
            <button onClick={() => setDir(crumbs.slice(0, i + 1).join('/'))} className="rounded-lg px-2 py-1 transition-colors hover:bg-raised">
              {c}
            </button>
          </span>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => api.files.reveal(inst.id, dir)}>
          <ExternalLink size={13} /> Show in Explorer
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        {entries == null ? (
          <div className="grid place-items-center py-12">
            <Spinner />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">This folder is empty.</p>
        ) : (
          entries.map((e) => (
            <div key={e.path} onDoubleClick={() => open(e)} onClick={() => e.dir && open(e)} className="group flex cursor-pointer items-center gap-3 border-b border-border px-4 py-2 last:border-0 transition-colors hover:bg-raised">
              {e.dir ? <Folder size={17} className="text-blue" /> : TEXT.test(e.name) ? <FileText size={17} className="text-muted" /> : <File size={17} className="text-muted" />}
              <span className="min-w-0 flex-1 truncate text-sm">{e.name}</span>
              <span className="w-20 text-right text-xs tabular-nums text-muted">{e.dir ? '' : bytes(e.size)}</span>
              <span className="w-28 text-right text-xs text-muted">{timeAgo(e.mtime)}</span>
              <div className="flex w-20 justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!e.dir && TEXT.test(e.name) && (
                  <IconButton label="Edit" onClick={() => open(e)}>
                    <FileText size={14} />
                  </IconButton>
                )}
                <ConfirmIconButton
                  label="Delete"
                  onConfirm={async () => {
                    await attempt(() => api.files.remove(inst.id, e.path))
                    load()
                  }}
                >
                  <Trash2 size={14} />
                </ConfirmIconButton>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-muted">Click a folder to open it. Double-click a text file (configs, options.txt) to edit it here.</p>

      {editing && (
        <Modal
          title={editing.path}
          onClose={() => (editing.text === editing.original || confirm('Discard unsaved changes?')) && setEditing(null)}
          width="max-w-4xl"
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button variant="primary" busy={saving} disabled={editing.text === editing.original} onClick={save}>
                Save
              </Button>
            </>
          }
        >
          <textarea
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            spellCheck={false}
            className="h-[55vh] w-full resize-none rounded-xl border border-border bg-bg p-4 font-mono text-[12.5px] leading-relaxed text-text outline-none focus:border-blue/60"
          />
        </Modal>
      )}
    </div>
  )
}
