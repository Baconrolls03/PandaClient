import { app, net } from 'electron'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, rename, rm } from 'node:fs/promises'
import { dirname } from 'node:path'

// Modrinth asks API clients to send an identifying User-Agent.
const userAgent = () => `PandaClient/${app.getVersion()} (Minecraft launcher)`

async function request(url: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<Response> {
  const res = await net.fetch(url, {
    ...init,
    headers: { 'User-Agent': userAgent(), ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(timeoutMs)
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${new URL(url).host} returned HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`)
  }
  return res
}

export async function getJson<T>(url: string, timeoutMs?: number): Promise<T> {
  return (await (await request(url, {}, timeoutMs)).json()) as T
}

export async function getText(url: string, timeoutMs?: number): Promise<string> {
  return (await request(url, {}, timeoutMs)).text()
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return (await res.json()) as T
}

export async function getBuffer(url: string, onProgress?: (received: number, total: number) => void): Promise<Buffer> {
  const res = await request(url, {}, 120_000)
  const total = Number(res.headers.get('content-length') ?? 0)
  if (!res.body) return Buffer.from(await res.arrayBuffer())
  const chunks: Uint8Array[] = []
  let received = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress?.(received, total)
  }
  return Buffer.concat(chunks)
}

/**
 * Stream `url` to `dest` (via a .part file), verifying the sha1 when given.
 * The file only appears at `dest` once it is complete and verified.
 */
export async function download(
  url: string,
  dest: string,
  opts: { sha1?: string; onProgress?: (received: number, total: number) => void } = {}
): Promise<void> {
  await mkdir(dirname(dest), { recursive: true })
  const part = `${dest}.part`
  const res = await request(url, {}, 300_000)
  const total = Number(res.headers.get('content-length') ?? 0)
  const hash = createHash('sha1')
  const fh = await open(part, 'w')
  try {
    let received = 0
    if (res.body) {
      const reader = res.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        hash.update(value)
        await fh.write(value)
        received += value.length
        opts.onProgress?.(received, total)
      }
    } else {
      const buf = Buffer.from(await res.arrayBuffer())
      hash.update(buf)
      await fh.write(buf)
    }
  } catch (e) {
    await fh.close()
    await rm(part, { force: true })
    throw e
  }
  await fh.close()
  const digest = hash.digest('hex')
  if (opts.sha1 && digest !== opts.sha1.toLowerCase()) {
    await rm(part, { force: true })
    throw new Error(`Checksum mismatch for ${url}`)
  }
  await rename(part, dest)
}

export function sha1File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha1')
    createReadStream(path)
      .on('data', (d) => h.update(d))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')))
  })
}

export function sha1(buf: Uint8Array): string {
  return createHash('sha1').update(buf).digest('hex')
}

/** Run `fn` over `items` with at most `limit` in flight. Rejects with the first error after all settle. */
export async function pool<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0
  let firstError: unknown = null
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      try {
        await fn(items[i], i)
      } catch (e) {
        firstError ??= e
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker))
  if (firstError) throw firstError
}
