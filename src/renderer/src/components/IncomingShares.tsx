import { useEffect, useState } from 'react'
import { PackageOpen } from 'lucide-react'
import type { IncomingShare } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Modal } from '@/components/ui'

const mb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** Pops up when another PandaClient player shares a mod instance with you. */
export function IncomingShares() {
  const { attempt, toast, navigate } = useStore()
  const [shares, setShares] = useState<IncomingShare[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.share.incoming().then(setShares).catch(() => {})
    return api.share.onIncoming(setShares)
  }, [])
  const s = shares[0]
  if (!s) return null
  const later = async () => {
    await attempt(() => api.share.dismiss(s.id))
    setShares((cur) => cur.filter((x) => x.id !== s.id))
  }
  const add = async () => {
    setBusy(true)
    const inst = await attempt(() => api.share.accept(s.id))
    setBusy(false)
    setShares((cur) => cur.filter((x) => x.id !== s.id))
    if (inst) {
      toast(`Added ${inst.name}`, 'success')
      navigate({ name: 'instance', id: inst.id })
    }
  }
  return (
    <Modal
      title="Shared mod instance"
      onClose={() => setShares((cur) => cur.filter((x) => x.id !== s.id))}
      width="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={later}>
            No thanks
          </Button>
          <Button variant="primary" onClick={add} busy={busy}>
            Add to library
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="grid size-12 place-items-center rounded-xl bg-mint/15 text-mint">
          <PackageOpen size={24} />
        </div>
        <div>
          <p className="text-sm">
            <span className="font-semibold">{s.from}</span> shared a mod instance with you
          </p>
          <p className="mt-0.5 font-semibold">{s.name}</p>
          <p className="text-xs text-muted">{mb(s.size)}</p>
        </div>
      </div>
    </Modal>
  )
}
