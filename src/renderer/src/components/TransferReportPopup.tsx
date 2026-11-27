import { useEffect, useState } from 'react'
import { CheckCircle2, MinusCircle } from 'lucide-react'
import type { TransferReport } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Modal } from '@/components/ui'

/** After mods were moved into a new profile: what came over and what had to be left out. */
export function TransferReportPopup() {
  const { navigate } = useStore()
  const [r, setR] = useState<TransferReport | null>(null)
  useEffect(() => api.instances.onTransferred(setR), [])
  if (!r) return null
  return (
    <Modal
      title={`Mods moved to ${r.profileName}`}
      onClose={() => setR(null)}
      width="max-w-lg"
      footer={
        <Button variant="primary" onClick={() => (navigate({ name: 'instance', id: r.profileId }), setR(null))}>
          Open {r.profileName}
        </Button>
      }
    >
      <p className="flex items-center gap-2 text-sm">
        <CheckCircle2 size={16} className="text-mint" />
        {r.moved.length} item{r.moved.length === 1 ? '' : 's'} moved from {r.from}, updated to the right version.
      </p>
      {r.removed.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Left out ({r.removed.length})</p>
          <div className="max-h-64 space-y-1.5 overflow-auto">
            {r.removed.map((m) => (
              <div key={m.name} className="flex items-start gap-2 rounded-lg border border-border bg-raised px-3 py-2">
                <MinusCircle size={14} className="mt-0.5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{m.reason}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">They're still in {r.from}, so nothing is lost.</p>
        </div>
      )}
    </Modal>
  )
}
