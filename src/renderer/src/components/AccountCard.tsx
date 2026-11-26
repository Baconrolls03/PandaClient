import { useEffect, useRef, useState } from 'react'
import { Check, ChevronUp, Loader2, LogOut, Plus, Settings2 } from 'lucide-react'
import type { Account } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'

export function MicrosoftMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden>
      <rect width="10" height="10" fill="#F25022" />
      <rect x="11" width="10" height="10" fill="#7FBA00" />
      <rect y="11" width="10" height="10" fill="#00A4EF" />
      <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
    </svg>
  )
}

/** The player's skin face, from their Minecraft UUID. */
export function SkinHead({ account, size = 36, className = '' }: { account: Pick<Account, 'uuid' | 'username'>; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <div className={`grid shrink-0 place-items-center rounded-lg bg-raised text-xs font-bold text-muted ${className}`} style={{ width: size, height: size }}>
        {account.username[0]?.toUpperCase()}
      </div>
    )
  return (
    <img
      src={`https://mc-heads.net/avatar/${account.uuid}/${Math.max(32, size * 2)}`}
      alt=""
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-lg [image-rendering:pixelated] ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function AccountCard() {
  const { accounts, activeAccount, setAccounts, signIn, openModal, attempt } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  async function add() {
    setBusy(true)
    setOpen(false)
    await signIn()
    setBusy(false)
  }

  if (!activeAccount) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-soft">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-raised text-xs font-bold text-muted">?</div>
          <div>
            <div className="text-sm font-semibold">Not signed in</div>
            <div className="text-xs text-muted">Sign in to play</div>
          </div>
        </div>
        <button
          onClick={add}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-raised px-3 py-2 text-sm font-medium transition-all hover:-translate-y-px hover:bg-border disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <MicrosoftMark />}
          {busy ? 'Waiting for Microsoft…' : 'Sign in'}
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 text-left shadow-soft transition-all hover:-translate-y-px hover:bg-raised"
      >
        <SkinHead account={activeAccount} size={38} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted">Playing as</div>
          <div className="truncate text-sm font-semibold">{activeAccount.username}</div>
        </div>
        <ChevronUp size={16} className={`text-muted transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-40 w-full min-w-60 animate-pop rounded-2xl border border-border bg-surface p-1.5 shadow-lift">
          {accounts.map((a) => (
            <div key={a.uuid} className="group flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-raised">
              <button
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                onClick={async () => {
                  const list = await attempt(() => api.auth.setActive(a.uuid))
                  if (list) setAccounts(list)
                  setOpen(false)
                }}
              >
                <SkinHead account={a} size={30} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.username}</span>
                {a.active && <Check size={15} className="text-mint" />}
              </button>
              <button
                aria-label={`Sign out ${a.username}`}
                title="Sign out"
                onClick={async () => {
                  const list = await attempt(() => api.auth.logout(a.uuid), `Signed out ${a.username}`)
                  if (list) setAccounts(list)
                }}
                className="grid size-7 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <LogOut size={14} />
              </button>
            </div>
          ))}
          <div className="my-1 border-t border-border" />
          <button onClick={add} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-sm font-medium transition-colors hover:bg-raised">
            <Plus size={16} className="text-mint" /> Add account
          </button>
          <button
            onClick={() => {
              setOpen(false)
              openModal({ kind: 'settings', section: 'accounts' })
            }}
            className="flex w-full items-center gap-2.5 rounded-xl p-2 text-sm text-muted transition-colors hover:bg-raised hover:text-text"
          >
            <Settings2 size={16} /> Manage accounts
          </button>
        </div>
      )}
    </div>
  )
}
