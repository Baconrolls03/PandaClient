import { useMemo, useState } from 'react'
import { Check, ImageIcon, Info, RotateCcw, Search, Shuffle, Upload } from 'lucide-react'
import type { IconPreset } from '@shared/types'
import { api } from '@/lib/api'
import { ICON_BACKGROUNDS, PresetIcon, VOX_SYMBOLS, randomPreset, voxOf } from '@/lib/icons'
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
  const recents = useMemo(loadRecents, [])
  const preset: IconPreset = choice.kind === 'preset' ? choice.preset : { bg: 'mint', symbol: 'panda' }
  const setPreset = (p: Partial<IconPreset>) => setChoice({ kind: 'preset', preset: { ...preset, ...p } })


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
            <Info size={14} /> Mix and match a background and a symbol, or upload your own image.
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
            <div className="flex gap-2 overflow-x-auto pb-2">
              {ICON_BACKGROUNDS.map((b) => {
                const active = choice.kind === 'preset' && preset.bg === b.id
                return (
                  <button
                    key={b.id}
                    title={b.name}
                    onClick={() => setPreset({ bg: b.id })}
                    className="relative size-14 shrink-0 rounded-2xl transition-transform hover:scale-105"
                    style={{ background: `linear-gradient(145deg, ${b.from}, ${b.to})` }}
                  >
                    {active && (
                      <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-white text-ink shadow">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
          <section className="border-t border-border pt-4">
            <h3 className="mb-2.5 text-sm font-semibold">Symbol</h3>
            <div className="grid max-h-[300px] grid-cols-6 gap-2 overflow-y-auto pr-1">
              {VOX_SYMBOLS.map((v) => {
                const active = choice.kind === 'preset' && voxOf(preset.symbol).id === v.id
                return (
                  <button
                    key={v.id}
                    title={v.name}
                    onClick={() => setPreset({ symbol: v.id })}
                    className={`relative grid aspect-square place-items-center rounded-2xl border transition-colors ${active ? 'border-text/60 bg-raised' : 'border-border bg-bg hover:bg-raised'}`}
                  >
                    <img src={v.src} alt={v.name} className="w-[72%] drop-shadow-[2px_3px_0_rgb(0_0_0/0.3)]" />
                    {active && (
                      <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-white text-ink shadow">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  )
}
