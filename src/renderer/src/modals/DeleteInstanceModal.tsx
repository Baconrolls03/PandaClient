import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Instance } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, InstanceIcon, Modal } from '@/components/ui'

export function DeleteInstanceModal({ inst, onClose }: { inst: Instance; onClose: () => void }) {
  const { attempt, navigate } = useStore()
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title="Delete profile"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            busy={busy}
            onClick={async () => {
              setBusy(true)
              await attempt(() => api.instances.remove(inst.id), `${inst.name} moved to the Recycle Bin`)
              onClose()
              navigate({ name: 'library' })
            }}
          >
            <Trash2 size={15} /> Delete
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={56} />
        <p className="text-sm text-muted">
          <span className="font-semibold text-text">{inst.name}</span> and everything in it (mods, worlds, screenshots) will be moved to the Recycle Bin.
        </p>
      </div>
    </Modal>
  )
}
