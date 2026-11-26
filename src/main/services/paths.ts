import { isAbsolute, normalize, relative, resolve, sep } from 'node:path'
import { getSettings } from './settings'

export const gameDir = () => getSettings().gameDir

/** True if `child` is `parent` or inside it. */
export function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * Join an untrusted relative path (from the renderer, or from a modpack) onto `base`,
 * refusing anything that would escape it.
 */
export function safeJoin(base: string, rel: string): string {
  const cleaned = normalize(rel.replace(/\\/g, '/')).replace(/^([/\\])+/, '')
  if (isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || cleaned.split(/[/\\]/).includes('..')) {
    throw new Error(`Unsafe path: ${rel}`)
  }
  const full = resolve(base, cleaned)
  if (!isInside(base, full)) throw new Error(`Unsafe path: ${rel}`)
  return full
}

/** URL the renderer can use to show a local image (served by the panda:// protocol). */
export function localUrl(abs: string, bust?: number): string {
  return `panda://local/${encodeURIComponent(abs.split(sep).join('/'))}${bust ? `?v=${Math.floor(bust)}` : ''}`
}
