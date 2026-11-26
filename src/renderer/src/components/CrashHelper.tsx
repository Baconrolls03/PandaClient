import { useEffect, useState } from 'react'
import { Bug, FileText, PowerOff } from 'lucide-react'
import type { CrashReport, LaunchProgress } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Modal } from '@/components/ui'

/** When Minecraft crashes: say why in plain words and offer to turn off the mod that caused it. */
export function CrashHelper() {
  const { attempt, instances } = useStore()
  const [crash, setCrash] = useState<{ instanceId: string; report: CrashReport } | null>(null)
  const [off, setOff] = useState<string[]>([])
  useEffect(
    () =>
      api.game.onProgress((p: LaunchProgress) => {
        if (p.stage === 'error' && p.crash && p.instanceId) {
          setOff([])
          setCrash({ instanceId: p.instanceId, report: p.crash })
        }
      }),
    []
  )
  if (!crash) return null
  const inst = instances.find((i) => i.id === crash.instanceId)
  const r = crash.report
  return (
    <Modal
      title="Minecraft crashed"
      onClose={() => setCrash(null)}
      width="max-w-lg"
      footer={
        <>
          {r.file && (
            <Button variant="ghost" onClick={() => api.system.openPath(r.file!)}>
              <FileText size={14} /> Crash report
            </Button>
          )}
          <Button variant="primary" onClick={() => setCrash(null)}>
            OK
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger/15 text-danger">
          <Bug size={20} />
        </div>
        <p className="text-sm leading-relaxed">{r.summary}</p>
      </div>
      {r.mods.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Turn off to fix</p>
          {r.mods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-raised px-3 py-2">
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted">{m.file}</p>
              </div>
              <Button
                size="sm"
                variant={off.includes(m.id) ? 'ghost' : 'danger'}
                disabled={off.includes(m.id)}
                onClick={async () => {
                  await attempt(() => api.content.toggle(crash.instanceId, m.file, 'mod'), `${m.name} turned off`)
                  setOff((o) => [...o, m.id])
                }}
              >
                <PowerOff size={13} /> {off.includes(m.id) ? 'Turned off' : 'Turn off'}
              </Button>
            </div>
          ))}
          {inst && <p className="text-xs text-muted">Then press Play on {inst.name} again.</p>}
        </div>
      )}
      <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-bg p-3 text-[11px] leading-snug text-muted">{r.excerpt}</pre>
    </Modal>
  )
}
