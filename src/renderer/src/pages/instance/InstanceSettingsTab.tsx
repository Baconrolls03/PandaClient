import { useEffect, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { Instance, SystemInfo } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { gb, LOADER_NAMES } from '@/lib/format'
import { Button, Card, InstanceIcon, TextField, Toggle } from '@/components/ui'

export function InstanceSettingsTab({ inst, onDelete }: { inst: Instance; onDelete: () => void }) {
  const { settings, attempt } = useStore()
  const [name, setName] = useState(inst.name)
  const [jvmArgs, setJvmArgs] = useState(inst.jvmArgs)
  const [info, setInfo] = useState<SystemInfo | null>(null)
  useEffect(() => {
    api.system.info().then(setInfo)
  }, [])
  useEffect(() => {
    setName(inst.name)
    setJvmArgs(inst.jvmArgs)
  }, [inst.id, inst.name, inst.jvmArgs])

  const save = (patch: Parameters<typeof api.instances.update>[1]) => attempt(() => api.instances.update(inst.id, patch))
  const maxRam = Math.max(2048, Math.floor(((info?.totalMemMb ?? 8192) - 2048) / 512) * 512)
  const ram = inst.ramMb ?? settings.ramMb
  const fill = ((ram - 1024) / (maxRam - 1024)) * 100

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card title="General">
        <div className="flex items-center gap-4">
          <InstanceIcon url={inst.iconUrl} size={64} />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  const f = await api.settings.pickFile('image')
                  if (f) attempt(() => api.instances.setIcon(inst.id, f))
                }}
              >
                <ImagePlus size={14} /> Change icon
              </Button>
              {inst.iconUrl && (
                <Button size="sm" variant="ghost" onClick={() => attempt(() => api.instances.setIcon(inst.id, null))}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
        <label className="mb-1.5 mt-5 block text-xs font-medium text-muted">Name</label>
        <TextField value={name} onChange={setName} className="w-full" onEnter={() => save({ name })} />
        {name !== inst.name && (
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="primary" onClick={() => save({ name })}>
              Save name
            </Button>
          </div>
        )}
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">Minecraft</dt>
          <dd>{inst.mcVersion}</dd>
          <dt className="text-muted">Loader</dt>
          <dd>
            {LOADER_NAMES[inst.loader]} {inst.loaderVersion ?? ''}
          </dd>
          <dt className="text-muted">Folder</dt>
          <dd className="truncate font-mono text-xs leading-5 text-muted">{inst.path}</dd>
        </dl>
      </Card>

      <Card title="Memory" description="Override the global RAM setting for this instance." action={<Toggle label="Custom memory" checked={inst.ramMb != null} onChange={(v) => save({ ramMb: v ? settings.ramMb : null })} />}>
        <div className={`flex items-center gap-5 ${inst.ramMb == null ? 'pointer-events-none opacity-40' : ''}`}>
          <input
            type="range"
            className="panda-range flex-1"
            min={1024}
            max={maxRam}
            step={512}
            value={Math.min(ram, maxRam)}
            style={{ ['--fill' as string]: `${fill}%` }}
            onChange={(e) => save({ ramMb: Number(e.target.value) })}
          />
          <div className="w-20 rounded-xl bg-raised py-2 text-center text-sm font-semibold tabular-nums">{gb(ram)}</div>
        </div>
      </Card>

      <Card title="Java" description="Leave empty to use the global setting.">
        <div className="flex gap-2">
          <TextField value={inst.javaPath ?? ''} onChange={(v) => save({ javaPath: v || null })} placeholder={settings.javaPath || 'Automatic'} mono className="flex-1" />
          <Button
            onClick={async () => {
              const f = await api.settings.pickFile('java', inst.javaPath ?? undefined)
              if (f) save({ javaPath: f })
            }}
          >
            Browse
          </Button>
        </div>
        <label className="mb-1.5 mt-5 block text-xs font-medium text-muted">Extra JVM arguments</label>
        <TextField value={jvmArgs} onChange={setJvmArgs} placeholder="-XX:+UseG1GC" mono className="w-full" onEnter={() => save({ jvmArgs })} />
        {jvmArgs !== inst.jvmArgs && (
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="primary" onClick={() => save({ jvmArgs })}>
              Save arguments
            </Button>
          </div>
        )}
      </Card>

      <Card title="Danger zone">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Delete this instance and everything in it, worlds included. It goes to the Recycle Bin.</p>
          <Button
            variant="danger"
            onClick={onDelete}
          >
            <Trash2 size={15} /> Delete
          </Button>
        </div>
      </Card>
    </div>
  )
}
