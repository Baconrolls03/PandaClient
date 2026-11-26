import { useEffect, useState } from 'react'
import { PartyPopper } from 'lucide-react'
import type { Invite } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, Modal } from '@/components/ui'

/** "Steve invited you to play on mc.hypixel.net" with a Join button. */
export function InvitePopup() {
  const { selected, launch, toast, running, attempt } = useStore()
  const [invites, setInvites] = useState<Invite[]>([])
  useEffect(() => {
    api.friends.invites().then(setInvites).catch(() => {})
    return api.friends.onInvites(setInvites)
  }, [])
  const inv = invites[0]
  if (!inv) return null
  const close = async () => {
    await attempt(() => api.friends.dismissInvite(inv.id))
    setInvites((cur) => cur.filter((i) => i.id !== inv.id))
  }
  const join = async () => {
    await close()
    if (!selected) return toast('Make an instance first', 'error')
    if (running.has(selected.id)) return toast(`${selected.name} is already running`, 'error')
    launch(selected.id, { server: inv.server })
  }
  return (
    <Modal
      title="Party invite"
      onClose={close}
      width="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Not now
          </Button>
          <Button variant="primary" onClick={join}>
            Join
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="grid size-12 place-items-center rounded-xl bg-mint/15 text-mint">
          <PartyPopper size={24} />
        </div>
        <p className="text-sm">
          <span className="font-semibold">{inv.from}</span> invited you to play on <span className="font-semibold">{inv.server}</span>
          {selected && <span className="block text-xs text-muted">Joins with {selected.name}</span>}
        </p>
      </div>
    </Modal>
  )
}
