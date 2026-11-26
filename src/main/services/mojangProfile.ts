// Real Minecraft skins and capes via Mojang's API: changes here are visible to every player on every server.
import { net } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import type { MojangProfile } from '@shared/types'
import { launchAuth } from './accounts'

const PROFILE = 'https://api.minecraftservices.com/minecraft/profile'

interface RawProfile {
  id: string
  name: string
  skins: { id: string; state: 'ACTIVE' | 'INACTIVE'; url: string; variant: 'CLASSIC' | 'SLIM' }[]
  capes: { id: string; state: 'ACTIVE' | 'INACTIVE'; url: string; alias: string }[]
}

async function call(path: string, init: RequestInit = {}): Promise<RawProfile> {
  const { accessToken } = await launchAuth()
  const res = await net.fetch(`${PROFILE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers as Record<string, string>) },
    signal: AbortSignal.timeout(20_000)
  })
  if (res.status === 429) throw new Error('Mojang is rate limiting skin changes. Wait a minute and try again.')
  if (!res.ok) throw new Error(`Mojang returned ${res.status} for your profile`)
  return (await res.json()) as RawProfile
}

const images = new Map<string, string>()
async function dataUrl(url: string): Promise<string | null> {
  if (images.has(url)) return images.get(url)!
  try {
    const res = await net.fetch(url.replace(/^http:/, 'https:'), { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null
    const out = `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
    images.set(url, out)
    return out
  } catch {
    return null
  }
}

async function shape(p: RawProfile): Promise<MojangProfile> {
  const active = p.skins.find((s) => s.state === 'ACTIVE') ?? p.skins[0]
  return {
    id: p.id,
    name: p.name,
    skin: active ? { id: active.id, state: active.state, variant: active.variant, image: await dataUrl(active.url) } : null,
    capes: await Promise.all(p.capes.map(async (c) => ({ id: c.id, alias: c.alias, state: c.state, image: await dataUrl(c.url) })))
  }
}

export async function profile(): Promise<MojangProfile> {
  return shape(await call(''))
}

export async function uploadSkin(file: string, variant: 'classic' | 'slim'): Promise<MojangProfile> {
  const png = await readFile(file)
  if (png.subarray(1, 4).toString() !== 'PNG') throw new Error('Skins must be PNG images.')
  // Multipart by hand: net.fetch doesn't take FormData everywhere.
  const boundary = `----PandaClient${Date.now().toString(16)}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="variant"\r\n\r\n${variant}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="skin.png"\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ])
  return shape(await call('/skins', { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body }))
}

export async function resetSkin(): Promise<MojangProfile> {
  await call('/skins/active', { method: 'DELETE' }).catch(() => null)
  return profile()
}

export async function setCape(capeId: string | null): Promise<MojangProfile> {
  if (capeId) return shape(await call('/capes/active', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capeId }) }))
  await call('/capes/active', { method: 'DELETE' }).catch(() => null)
  return profile()
}

export async function readImage(file: string): Promise<string> {
  if (!/\.png$/i.test(file)) throw new Error('Choose a PNG image')
  if ((await stat(file)).size > 1024 * 1024) throw new Error('That image is too big for a skin')
  return `data:image/png;base64,${(await readFile(file)).toString('base64')}`
}
