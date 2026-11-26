import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2, MoreHorizontal, Search, X } from 'lucide-react'
import type { IconPreset } from '@shared/types'
import { PresetIcon } from '@/lib/icons'
import { Logo } from './Logo'

export function Card({ title, description, children, action }: { title?: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      {title && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={title ? 'mt-5' : ''}>{children}</div>
    </section>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-mint text-ink hover:brightness-110 shadow-mint',
  secondary: 'bg-raised text-text hover:bg-border',
  ghost: 'text-muted hover:bg-raised hover:text-text',
  danger: 'bg-danger/12 text-danger hover:bg-danger hover:text-white',
  blue: 'bg-blue/15 text-blue hover:bg-blue hover:text-white'
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  busy,
  size = 'md',
  className = '',
  title
}: {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  disabled?: boolean
  busy?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  title?: string
}) {
  const sizes = { sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg', md: 'h-10 px-4 text-sm gap-2 rounded-xl', lg: 'h-12 px-6 text-base gap-2.5 rounded-xl font-semibold' }
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex shrink-0 items-center justify-center font-medium transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
    >
      {busy && <Loader2 size={size === 'sm' ? 13 : 16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function IconButton({ label, onClick, children, danger, className = '' }: { label: string; onClick?: () => void; children: ReactNode; danger?: boolean; className?: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-raised ${danger ? 'hover:text-danger' : 'hover:text-text'} ${className}`}
    >
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-mint' : 'bg-raised'}`}
    >
      <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export function TextField({
  value,
  onChange,
  placeholder,
  mono,
  className = '',
  onEnter,
  autoFocus
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
  className?: string
  onEnter?: () => void
  autoFocus?: boolean
}) {
  return (
    <input
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      spellCheck={false}
      className={`h-10 min-w-0 rounded-xl border border-border bg-bg px-3 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-blue/60 ${mono ? 'font-mono text-[12.5px]' : ''} ${className}`}
    />
  )
}

export function SearchField({ value, onChange, placeholder = 'Search', className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={`flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 transition-colors focus-within:border-blue/60 ${className}`}>
      <Search size={15} className="shrink-0 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
      {value && (
        <button aria-label="Clear" onClick={() => onChange('')} className="text-muted hover:text-text">
          <X size={14} />
        </button>
      )}
    </label>
  )
}

export function Select<T extends string>({ value, onChange, options, className = '' }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`h-10 cursor-pointer rounded-xl border border-border bg-surface px-3 pr-8 text-sm text-text outline-none transition-colors hover:bg-raised focus:border-blue/60 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface">
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            value === t.id ? 'bg-raised text-text shadow-soft' : 'text-muted hover:text-text'
          }`}
        >
          {t.icon}
          {t.label}
          {t.count != null && <span className="rounded-md bg-bg px-1.5 text-[11px] tabular-nums text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Chip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
        active ? 'border-mint/40 bg-mint/12 text-mint' : 'border-border bg-surface text-muted hover:border-border hover:bg-raised hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'mint' | 'blue' | 'danger' | 'amber' }) {
  const tones = {
    muted: 'bg-raised text-muted',
    mint: 'bg-mint/12 text-mint',
    blue: 'bg-blue/15 text-blue',
    danger: 'bg-danger/15 text-danger',
    amber: 'bg-amber-400/12 text-amber-300'
  }
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 size={20} className={`animate-spin text-muted ${className}`} />
}

export function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface text-muted shadow-soft">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Instance icon: uploaded image, else a preset (gradient + symbol), else the panda badge. */
export function InstanceIcon({ url, preset, size = 48, className = '' }: { url: string | null; preset?: IconPreset | null; size?: number; className?: string }) {
  if (url)
    return <img src={url} alt="" width={size} height={size} className={`shrink-0 rounded-xl object-cover ${className}`} style={{ width: size, height: size }} draggable={false} />
  if (preset) return <PresetIcon preset={preset} size={size} className={className} />
  return (
    <div className={`shrink-0 overflow-hidden rounded-xl ${className}`} style={{ width: size, height: size }}>
      <Logo size={size} />
    </div>
  )
}

export function ProjectIcon({ url, size = 48, className = '' }: { url: string | null | undefined; size?: number; className?: string }) {
  return url ? (
    <img src={url} alt="" loading="lazy" className={`shrink-0 rounded-xl bg-raised object-cover ${className}`} style={{ width: size, height: size, minWidth: size, minHeight: size }} draggable={false} />
  ) : (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-raised text-muted ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.45} height={size * 0.45} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    </div>
  )
}

export function LoaderBadge({ version }: { version?: string | null }) {
  return <Badge tone="mint">Fabric{version ? ` ${version}` : ''}</Badge>
}

const modalStack: symbol[] = []

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
  allowOverflow = false
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
  /** Let dropdowns inside spill out of the dialog (for short dialogs that never need to scroll). */
  allowOverflow?: boolean
}) {
  // Only the top-most dialog reacts to Escape.
  const id = useRef(Symbol('modal'))
  useEffect(() => {
    const me = id.current
    modalStack.push(me)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && modalStack[modalStack.length - 1] === me && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      modalStack.splice(modalStack.indexOf(me), 1)
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[85vh] w-full ${width} animate-pop flex-col rounded-2xl border border-border bg-surface shadow-lift ${allowOverflow ? '' : 'overflow-hidden'}`}>
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        <div className={`min-h-0 flex-1 p-6 ${allowOverflow ? '' : 'overflow-y-auto'}`}>{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}

export function Menu({ items, trigger }: { items: { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean }[]; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        aria-label="More"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="grid h-10 w-10 place-items-center rounded-xl bg-raised text-muted transition-colors hover:bg-border hover:text-text"
      >
        {trigger ?? <MoreHorizontal size={18} />}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-48 animate-pop rounded-xl border border-border bg-surface p-1 shadow-lift">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                it.onClick()
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-raised ${it.danger ? 'text-danger' : 'text-text'}`}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Click once to arm, again to confirm. Avoids a dialog for small destructive actions. */
export function ConfirmIconButton({ label, onConfirm, children }: { label: string; onConfirm: () => void; children: ReactNode }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 2500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      aria-label={label}
      title={armed ? 'Click again to confirm' : label}
      onClick={(e) => {
        e.stopPropagation()
        if (armed) onConfirm()
        setArmed(!armed)
      }}
      className={`grid h-8 shrink-0 place-items-center rounded-lg px-2 text-xs font-medium transition-all ${
        armed ? 'bg-danger text-white' : 'w-8 text-muted hover:bg-raised hover:text-danger'
      }`}
    >
      {armed ? 'Confirm' : children}
    </button>
  )
}
