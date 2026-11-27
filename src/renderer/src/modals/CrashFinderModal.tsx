import { useEffect, useState } from 'react'
import { PowerOff, Search, Square } from 'lucide-react'
import type { CrashFinderState, Instance } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Modal } from '@/components/ui'

/** Run the crash finder from a profile's page, without waiting for a crash first. */
export function CrashFinderModal({ inst, onClose }: { inst: Instance; onClose: () => void }) {
  const { attempt } = useStore()
  const [s, setS] = useState<CrashFinderState | null>(null)
  const [off, setOff] = useState(false)
  useEffect(() => {
    api.doctor.crashFinderState().then((x) => x.instanceId === inst.id && setS(x))
    return api.doctor.onCrashFinder((x) => x.instanceId === inst.id && setS(x))
  }, [inst.id])
  const running = s?.running
  return (
    <Modal
      title="Find a broken mod"
      onClose={() => !running && onClose()}
      width="max-w-lg"
      footer={
        running ? (
          <Button variant="ghost" onClick={() => api.doctor.cancelFindCrash()}>
            <Square size={13} /> Stop
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={() => api.doctor.findCrash(inst.id).catch(() => {})}>
              <Search size={14} /> {s ? 'Run again' : 'Start'}
            </Button>
          </>
        )
      }
    >
      <p className="text-sm leading-relaxed text-muted">
        If {inst.name} crashes or won't start, PandaClient starts it a few times with some mods switched off to find the one causing it. Minecraft opens and
        closes by itself. Afterwards every mod is put back as it was.
      </p>
      {s && (
        <div className="mt-4 rounded-lg border border-border bg-raised p-3">
          {running && (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${Math.min(100, (s.step / Math.max(1, s.steps)) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Test {s.step} of about {s.steps}
              </p>
            </>
          )}
          <p className="mt-1 text-sm">{s.error ?? s.message}</p>
          {!running && s.culprit && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant={off ? 'ghost' : 'danger'}
                disabled={off}
                onClick={async () => (await attempt(() => api.content.toggle(inst.id, s.culprit!.file, 'mod'), `${s.culprit!.name} turned off`), setOff(true))}
              >
                <PowerOff size={13} /> {off ? 'Turned off' : `Turn off ${s.culprit.name}`}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
