// Browser-preview access to the real Modrinth API (it allows cross-origin requests).
// In Electron, the same calls go through the main process instead.
import type { MrCategory, MrGameVersion, MrProject, MrSearchResult, MrTeamMember, MrVersion, SearchQuery } from '@shared/types'
import { MODRINTH_API, searchUrl, versionsUrl } from '@shared/modrinthQuery'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Modrinth returned HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const webModrinth = {
  search: (q: SearchQuery) => get<MrSearchResult>(searchUrl(MODRINTH_API, q)),
  project: (id: string) => get<MrProject>(`${MODRINTH_API}/project/${encodeURIComponent(id)}`),
  projects: (ids: string[]) => get<MrProject[]>(`${MODRINTH_API}/projects?ids=${encodeURIComponent(JSON.stringify(ids))}`),
  versions: (id: string, filter?: { loaders?: string[]; gameVersions?: string[] }) => get<MrVersion[]>(versionsUrl(MODRINTH_API, id, filter)),
  members: (id: string) => get<MrTeamMember[]>(`${MODRINTH_API}/project/${encodeURIComponent(id)}/members`),
  categories: () => get<MrCategory[]>(`${MODRINTH_API}/tag/category`),
  gameVersions: () => get<MrGameVersion[]>(`${MODRINTH_API}/tag/game_version`)
}

/** Use the live API; fall back to sample data when offline. */
export async function live<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback()
  }
}
