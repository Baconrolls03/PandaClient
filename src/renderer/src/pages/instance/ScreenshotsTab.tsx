import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, Image, Trash2, Copy } from 'lucide-react'
import type { Instance, Screenshot } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { timeAgo } from '@/lib/format'
import { Button, ConfirmIconButton, Empty, IconButton, Spinner } from '@/components/ui'
import { Lightbox } from '@/components/Lightbox'

export function ScreenshotsTab({ inst }: { inst: Instance }) {
  const { attempt } = useStore()
  const [shots, setShots] = useState<Screenshot[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const load = useCallback(() => api.screenshots.list(inst.id).then(setShots).catch(() => setShots([])), [inst.id])
  useEffect(() => {
    load()
  }, [load])

  if (shots == null) return <Spinner />
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{shots.length} screenshots · press F2 in game to take one</p>
        <Button size="sm" variant="ghost" onClick={() => api.instances.openFolder(inst.id, 'screenshots')}>
          <FolderOpen size={14} /> Open folder
        </Button>
      </div>
      {shots.length === 0 ? (
        <Empty icon={<Image size={22} />} title="No screenshots yet" />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {shots.map((s, i) => (
            <div key={s.file} className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              <button onClick={() => setOpen(i)} className="block w-full">
                <img src={s.url} alt="" loading="lazy" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </button>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="truncate text-xs text-muted">{timeAgo(s.mtime)}</span>
                <span className="flex items-center gap-1">
                <IconButton label="Copy" onClick={() => attempt(() => api.screenshots.copy(inst.id, s.file), 'Screenshot copied. Paste it anywhere')}>
                  <Copy size={14} />
                </IconButton>
                <ConfirmIconButton
                  label="Delete"
                  onConfirm={async () => {
                    await attempt(() => api.screenshots.remove(inst.id, s.file))
                    load()
                  }}
                >
                  <Trash2 size={14} />
                </ConfirmIconButton>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {open != null && <Lightbox images={shots.map((s) => ({ url: s.url, title: s.file }))} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  )
}
