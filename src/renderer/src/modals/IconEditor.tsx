import { useMemo, useState } from 'react'
import { Check, ImageIcon, Info, RotateCcw, Search, Shuffle, Upload } from 'lucide-react'
import type { IconPreset } from '@shared/types'
import { api } from '@/lib/api'
import { ICON_BACKGROUNDS, ICON_GROUPS, PresetIcon, randomPreset } from '@/lib/icons'
import { Button, InstanceIcon, Modal } from '@/components/ui'

export type IconChoice = { kind: 'preset'; preset: IconPreset } | { kind: 'file'; file: string } | { kind: 'default' }

const RECENTS_KEY = 'panda.recentIcons'
function loadRecents(): IconPreset[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') as IconPreset[]
  } catch {
    return []
  }
}
function pushRecent(p: IconPreset) {
  try {
    const list = [p, ...loadRecents().filter((r) => r.bg !== p.bg || r.symbol !== p.symbol)].slice(0, 10)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable: recents are just a convenience */
  }
}

export function IconEditor({ initial, onSave, onClose }: { initial: IconChoice; onSave: (c: IconChoice) => void; onClose: () => void }) {
  const [choice, setChoice] = useState<IconChoice>(initial)
  const [query, setQuery] = useState('')
  const recents = useMemo(loadRecents, [])
  const preset: IconPreset = choice.kind === 'preset' ? choice.preset : { bg: 'mint', symbol: 'panda' }
  const setPreset = (p: Partial<IconPreset>) => setChoice({ kind: 'preset', preset: { ...preset, ...p } })

  const groups = ICON_GROUPS.map((g) => ({ ...g, icons: Object.entries(g.icons).filter(([id]) => id.includes(query.trim().toLowerCase())) })).filter((g) => g.icons.length)

  const preview = (size: number) =>
    choice.kind === 'preset' ? (
      <PresetIcon preset={choice.preset} size={size} className={size > 60 ? 'rounded-3xl' : ''} />
    ) : choice.kind === 'file' ? (
      <div className="grid place-items-center rounded-xl bg-raised text-muted" style={{ width: size, height: size }}>
        <ImageIcon size={size * 0.4} />
      </div>
    ) : (
      <InstanceIcon url={null} size={size} className={size > 60 ? 'rounded-3xl' : ''} />
    )

  return (
    <Modal
      title="Icon editor"
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <span className="mr-auto flex items-center gap-2 text-xs text-muted">
            <Info size={14} /> Mix a background and a symbol, or upload your own image.
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (choice.kind === 'preset') pushRecent(choice.preset)
              onSave(choice)
            }}
          >
            <Check size={16} /> Save icon
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[200px_1fr] gap-6">
        {/* Preview */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-bg/60 p-4">
            {preview(128)}
            <div className="flex items-end gap-2">
              {preview(40)}
              {preview(28)}
              {preview(18)}
            </div>
            {choice.kind === 'file' && <p className="w-full truncate text-center text-[11px] text-muted" title={choice.file}>{choice.file.split(/[\\/]/).pop()}</p>}
          </div>
          <Button onClick={() => setChoice({ kind: 'preset', preset: randomPreset() })}>
            <Shuffle size={15} /> Randomize
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const file = await api.settings.pickFile('image')
              if (file) setChoice({ kind: 'file', file })
            }}
          >
            <Upload size={15} /> Upload image
          </Button>
          <Button variant="ghost" onClick={() => setChoice({ kind: 'default' })}>
            <RotateCcw size={15} /> Panda default
          </Button>
          {recents.length > 0 && (
            <div>
              <h3 className="mb-2 mt-1 text-xs font-semibold text-muted">Recents</h3>
              <div className="flex flex-wrap gap-1.5">
                {recents.map((r, i) => (
                  <button key={i} onClick={() => setChoice({ kind: 'preset', preset: r })} className="transition-transform hover:scale-110">
                    <PresetIcon preset={r} size={32} className="rounded-lg" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pickers */}
        <div className="flex min-w-0 flex-col gap-5">
          <section>
            <h3 className="mb-2.5 text-sm font-semibold">Background</h3>
            <div className="grid grid-cols-8 gap-2">
              {ICON_BACKGROUNDS.map((b) => {
                const active = choice.kind === 'preset' && preset.bg === b.id
                return (
                  <button
                    key={b.id}
                    title={b.name}
                    onClick={() => setPreset({ bg: b.id })}
                    className={`relative aspect-square rounded-xl transition-all hover:scale-105 ${active ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''}`}
                    style={{ background: `linear-gradient(145deg, ${b.from}, ${b.to})` }}
                  >
                    {active && <Check size={16} className="absolute inset-0 m-auto" color={b.dark ? '#141B24' : '#fff'} />}
                  </button>
                )
              })}
            </div>
          </section>
          <section className="min-h-0">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Symbol</h3>
              <label className="flex h-8 w-48 items-center gap-2 rounded-lg bg-bg px-2.5">
                <Search size={13} className="text-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbols" className="w-full bg-transparent text-xs outline-none placeholder:text-muted" />
              </label>
            </div>
            <div className="max-h-[300px] overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g.name} className="mb-3">
                  <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.name}</h4>
                  <div className="grid grid-cols-9 gap-1.5">
                    {g.icons.map(([id, Icon]) => {
                      const active = choice.kind === 'preset' && preset.symbol === id
                      return (
                        <button
                          key={id}
                          title={id}
                          onClick={() => setPreset({ symbol: id })}
                          className={`grid aspect-square place-items-center rounded-lg border transition-all hover:-translate-y-px hover:bg-raised ${active ? 'border-mint bg-mint/10 text-mint' : 'border-border text-muted hover:text-text'}`}
                        >
                          <Icon size={18} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {groups.length === 0 && <p className="py-6 text-center text-sm text-muted">No symbols match.</p>}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  )
}
