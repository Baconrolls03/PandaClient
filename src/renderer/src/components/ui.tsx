import type { ReactNode } from 'react'

export function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'secondary' | 'primary' | 'ghost'
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-mint text-ink hover:bg-[#7ff09f]',
    secondary: 'bg-raised text-text hover:bg-border',
    ghost: 'text-muted hover:bg-raised hover:text-text'
  }[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 ${styles}`}
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
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-mint' : 'bg-raised'}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-text shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

export function PathField({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 font-mono text-[12.5px] text-text outline-none transition-colors placeholder:font-sans placeholder:text-muted focus:border-blue/60"
    />
  )
}
