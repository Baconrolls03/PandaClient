import { useEffect, useState } from 'react'
import { Bug, FileText, PowerOff, Search, Square } from 'lucide-react'
import type { CrashFinderState, CrashReport, LaunchProgress } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Modal } from '@/components/ui'

/** When Minecraft crashes: say why in plain words and offer to turn off the mod that caused it. */
export function CrashHelper() {
  const { attempt, instances } = useStore()
  const [crash, setCrash] = useState<{ instanceId: string; report: CrashReport } | null>(null)
  const [off, setOff] = useState<string[]>([])
  const [finder, setFinder] = useState<CrashFinderState | null>(null)
  useEffect(() => api.doctor.onCrashFinder(setFinder), [])
  useEffect(
    () =>
      api.game.onProgress((p: LaunchProgress) => {
        if (p.stage === 'error' && p.crash && p.instanceId) {
          setOff([])
          setFinder(null)
          setCrash({ instanceId: p.instanceId, report: p.crash })
        }
      }),
    []
  )
  if (!crash) return null
  const inst = instances.find((i) => i.id === crash.instanceId)
  const r = crash.report
  const turnOff = async (m: { id: string; name: string; file: string }) => {
    await attempt(() => api.content.toggle(crash.instanceId, m.file, 'mod'), `${m.name} turned off`)
    setOff((o) => [...o, m.id])
  }
  const finding = finder?.running && finder.instanceId === crash.instanceId
  return (
    <Modal
      title="Minecraft crashed"
      onClose={() => !finding && setCrash(null)}
      width="max-w-lg"
      footer={
        <>
          {r.file && (
            <Button variant="ghost" onClick={() => api.system.openPath(r.file!)}>
              <FileText size={14} /> Crash report
            </Button>
          )}
          {finding ? (
            <Button variant="ghost" onClick={() => api.doctor.cancelFindCrash()}>
              <Square size={13} /> Stop
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => api.doctor.findCrash(crash.instanceId).catch(() => {})} title="Starts Minecraft a few times with some mods switched off to find the one that crashes it">
              <Search size={14} /> Find the broken mod
            </Button>
          )}
          <Button variant="primary" disabled={!!finding} onClick={() => setCrash(null)}>
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
                onClick={() => turnOff(m)}
              >
                <PowerOff size={13} /> {off.includes(m.id) ? 'Turned off' : 'Turn off'}
              </Button>
            </div>
          ))}
          {inst && <p className="text-xs text-muted">Then press Play on {inst.name} again.</p>}
        </div>
      )}
      {finder && finder.instanceId === crash.instanceId && (finder.running || finder.message) && (
        <div className="mt-4 rounded-lg border border-border bg-raised p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Crash finder</p>
          {finder.running && (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${Math.min(100, (finder.step / Math.max(1, finder.steps)) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Test {finder.step} of about {finder.steps}. Minecraft will open and close by itself; leave it running.
              </p>
            </>
          )}
          <p className="mt-2 text-sm">{finder.error ?? finder.message}</p>
          {!finder.running && finder.culprit && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">{finder.culprit.file}</span>
              <Button size="sm" variant={off.includes(finder.culprit.id) ? 'ghost' : 'danger'} disabled={off.includes(finder.culprit.id)} onClick={() => turnOff(finder.culprit!)}>
                <PowerOff size={13} /> {off.includes(finder.culprit.id) ? 'Turned off' : `Turn off ${finder.culprit.name}`}
              </Button>
            </div>
          )}
          {!finder.running && <p className="mt-1 text-[11px] text-muted">All your other mods are back as they were.</p>}
        </div>
      )}
      <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-bg p-3 text-[11px] leading-snug text-muted">{r.excerpt}</pre>
    </Modal>
  )
}
