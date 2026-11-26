import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import type { Account } from '@shared/types'
import { api } from '@/lib/api'

function MicrosoftMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 21 21" aria-hidden>
      <rect width="10" height="10" fill="#F25022" />
      <rect x="11" width="10" height="10" fill="#7FBA00" />
      <rect y="11" width="10" height="10" fill="#00A4EF" />
      <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
    </svg>
  )
}

export function AccountCard() {
  const [account, setAccount] = useState<Account | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.auth.current().then(setAccount)
  }, [])

  async function login() {
    setBusy(true)
    setError(null)
    try {
      setAccount(await api.auth.login())
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (account) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft">
        <img
          src={`https://mc-heads.net/avatar/${account.uuid}/64`}
          alt=""
          className="size-9 rounded-lg [image-rendering:pixelated]"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{account.username}</div>
          <div className="text-xs text-muted">Microsoft account</div>
        </div>
        <button
          aria-label="Sign out"
          onClick={() => api.auth.logout().then(() => setAccount(null))}
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-danger"
        >
          <LogOut size={16} />
        </button>
      </div>
    )
  }

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
        onClick={login}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-raised px-3 py-2 text-sm font-medium transition-all hover:-translate-y-px hover:bg-border disabled:opacity-60"
      >
        <MicrosoftMark />
        {busy ? 'Opening…' : 'Sign in'}
      </button>
      {error && <p className="mt-2 animate-pop text-xs leading-snug text-muted">{error}</p>}
    </div>
  )
}
