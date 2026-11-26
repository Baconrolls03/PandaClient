import { useMemo, type MouseEvent } from 'react'
import { api } from '@/lib/api'
import { renderMarkdown } from '@/lib/markdown'

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source])
  // Links open in the system browser, never inside the launcher.
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a) return
    e.preventDefault()
    if (a.href.startsWith('https://')) api.system.openExternal(a.href)
  }
  return <div className={`markdown ${className}`} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
}
