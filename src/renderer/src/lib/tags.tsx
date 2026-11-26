import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import type { MrCategory } from '@shared/types'
import { api } from './api'

let cache: Promise<MrCategory[]> | null = null
const loadCategories = () => {
  cache ??= api.modrinth.categories().catch((e) => {
    cache = null
    throw e
  })
  return cache
}

/** Modrinth's category list (with SVG icons), fetched once per session. */
export function useCategories(): MrCategory[] {
  const [cats, setCats] = useState<MrCategory[]>([])
  useEffect(() => {
    loadCategories().then(setCats).catch(() => {})
  }, [])
  return cats
}

const svgCache = new Map<string, string>()

/** Modrinth's own icon for a category, sanitised (they're SVG strings from the API). */
export function CategoryIcon({ name, categories, className = 'size-3.5' }: { name: string; categories: MrCategory[]; className?: string }) {
  const raw = categories.find((c) => c.name === name)?.icon
  if (!raw) return null
  let clean = svgCache.get(raw)
  if (clean == null) {
    clean = DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } })
    svgCache.set(raw, clean)
  }
  return <span aria-hidden className={`inline-grid shrink-0 place-items-center [&>svg]:size-full ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />
}
