import type { SearchQuery } from './types'

export const MODRINTH_API = 'https://api.modrinth.com/v2'

const json = (v: unknown) => encodeURIComponent(JSON.stringify(v))

/** Build a Modrinth /search URL. Shared by the Electron main process and the browser preview. */
export function searchUrl(api: string, query: SearchQuery): string {
  const facets: string[][] = [[`project_type:${query.type}`]]
  if (query.loaders.length) facets.push(query.loaders.map((l) => `categories:${l}`))
  for (const c of query.categories) facets.push([`categories:${c}`])
  if (query.gameVersions.length) facets.push(query.gameVersions.map((v) => `versions:${v}`))
  if (query.environment === 'client') facets.push(['client_side:required', 'client_side:optional'])
  if (query.environment === 'server') facets.push(['server_side:required', 'server_side:optional'])
  const params = [
    `query=${encodeURIComponent(query.query)}`,
    `facets=${json(facets)}`,
    `index=${query.sort}`,
    `offset=${query.offset}`,
    `limit=${Math.min(100, query.limit)}`
  ]
  return `${api}/search?${params.join('&')}`
}

export function versionsUrl(api: string, idOrSlug: string, filter: { loaders?: string[]; gameVersions?: string[] } = {}): string {
  const params: string[] = []
  if (filter.loaders?.length) params.push(`loaders=${json(filter.loaders)}`)
  if (filter.gameVersions?.length) params.push(`game_versions=${json(filter.gameVersions)}`)
  return `${api}/project/${encodeURIComponent(idOrSlug)}/version${params.length ? `?${params.join('&')}` : ''}`
}
