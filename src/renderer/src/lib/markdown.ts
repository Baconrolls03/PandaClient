import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Every link opens in the user's browser (main process enforces https-only).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noreferrer')
  }
})

/** Modrinth descriptions are Markdown with inline HTML. Render, then sanitise. */
export function renderMarkdown(src: string): string {
  const html = marked.parse(src ?? '', { async: false, gfm: true, breaks: false }) as string
  return DOMPurify.sanitize(html, { FORBID_TAGS: ['style', 'form', 'input'], ADD_ATTR: ['target'] })
}
