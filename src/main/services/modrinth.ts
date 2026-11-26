import type {
  MrCategory,
  MrGameVersion,
  MrProject,
  MrSearchResult,
  MrTeamMember,
  MrVersion,
  SearchQuery
} from '@shared/types'
import { MODRINTH_API, searchUrl, versionsUrl } from '@shared/modrinthQuery'
import { getJson, postJson } from './http'

export const API = process.env['PANDA_MODRINTH_API'] ?? MODRINTH_API

const q = (v: unknown) => encodeURIComponent(JSON.stringify(v))

export function search(query: SearchQuery): Promise<MrSearchResult> {
  return getJson<MrSearchResult>(searchUrl(API, query))
}

export const project = (idOrSlug: string) => getJson<MrProject>(`${API}/project/${encodeURIComponent(idOrSlug)}`)

export async function projects(ids: string[]): Promise<MrProject[]> {
  if (!ids.length) return []
  const out: MrProject[] = []
  for (let i = 0; i < ids.length; i += 200) out.push(...(await getJson<MrProject[]>(`${API}/projects?ids=${q(ids.slice(i, i + 200))}`)))
  return out
}

export function versions(idOrSlug: string, filter: { loaders?: string[]; gameVersions?: string[] } = {}): Promise<MrVersion[]> {
  return getJson<MrVersion[]>(versionsUrl(API, idOrSlug, filter))
}

export const version = (id: string) => getJson<MrVersion>(`${API}/version/${encodeURIComponent(id)}`)

export async function versionsByIds(ids: string[]): Promise<MrVersion[]> {
  if (!ids.length) return []
  const out: MrVersion[] = []
  for (let i = 0; i < ids.length; i += 200) out.push(...(await getJson<MrVersion[]>(`${API}/versions?ids=${q(ids.slice(i, i + 200))}`)))
  return out
}

export const members = (idOrSlug: string) => getJson<MrTeamMember[]>(`${API}/project/${encodeURIComponent(idOrSlug)}/members`)

/** sha1 → the version that file belongs to. Unknown hashes are absent. */
export function versionsFromHashes(hashes: string[]): Promise<Record<string, MrVersion>> {
  if (!hashes.length) return Promise.resolve({})
  return postJson(`${API}/version_files`, { hashes, algorithm: 'sha1' })
}

/** sha1 → newest compatible version of the same project. */
export function latestFromHashes(hashes: string[], loaders: string[] | null, gameVersions: string[]): Promise<Record<string, MrVersion>> {
  if (!hashes.length) return Promise.resolve({})
  return postJson(`${API}/version_files/update`, {
    hashes,
    algorithm: 'sha1',
    ...(loaders ? { loaders } : {}),
    game_versions: gameVersions
  })
}

let categoryCache: Promise<MrCategory[]> | null = null
export function categories(): Promise<MrCategory[]> {
  categoryCache ??= getJson<MrCategory[]>(`${API}/tag/category`).catch((e) => {
    categoryCache = null
    throw e
  })
  return categoryCache
}

let gameVersionCache: Promise<MrGameVersion[]> | null = null
export function gameVersions(): Promise<MrGameVersion[]> {
  gameVersionCache ??= getJson<MrGameVersion[]>(`${API}/tag/game_version`).catch((e) => {
    gameVersionCache = null
    throw e
  })
  return gameVersionCache
}
