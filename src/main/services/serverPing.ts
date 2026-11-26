// Minecraft "server list ping": asks a server for its player count, MOTD and icon (what the multiplayer list shows).
import { Socket } from 'node:net'
import { resolveSrv } from 'node:dns/promises'
import type { ServerStatus } from '@shared/types'

function varint(n: number): Buffer {
  const out: number[] = []
  do {
    let b = n & 0x7f
    n >>>= 7
    if (n) b |= 0x80
    out.push(b)
  } while (n)
  return Buffer.from(out)
}
const packet = (id: number, data: Buffer) => {
  const body = Buffer.concat([varint(id), data])
  return Buffer.concat([varint(body.length), body])
}
function readVarint(buf: Buffer, off: number): [number, number] | null {
  let n = 0
  for (let i = 0; i < 5; i++) {
    if (off + i >= buf.length) return null
    const b = buf[off + i]
    n |= (b & 0x7f) << (7 * i)
    if (!(b & 0x80)) return [n >>> 0, off + i + 1]
  }
  return null
}
const plain = (c: unknown): string =>
  typeof c === 'string' ? c.replace(/§./g, '') : c && typeof c === 'object' ? plain((c as { text?: unknown }).text ?? '') + ((c as { extra?: unknown[] }).extra ?? []).map(plain).join('') : ''

export async function pingServer(address: string, timeoutMs = 5000): Promise<ServerStatus> {
  let [host, portStr] = address.split(':')
  let port = Number(portStr) || 25565
  if (!portStr) {
    const srv = await resolveSrv(`_minecraft._tcp.${host}`).catch(() => [])
    if (srv[0]) ((host = srv[0].name), (port = srv[0].port))
  }
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const sock = new Socket()
    let buf = Buffer.alloc(0)
    const done = (e?: Error, s?: ServerStatus) => {
      sock.destroy()
      e ? reject(e) : resolve(s!)
    }
    sock.setTimeout(timeoutMs, () => done(new Error('Timed out')))
    sock.on('error', (e) => done(e))
    sock.connect(port, host, () => {
      const hostBuf = Buffer.from(host, 'utf8')
      const portBuf = Buffer.alloc(2)
      portBuf.writeUInt16BE(port)
      sock.write(packet(0, Buffer.concat([varint(767), varint(hostBuf.length), hostBuf, portBuf, varint(1)])))
      sock.write(packet(0, Buffer.alloc(0)))
    })
    sock.on('data', (d: Buffer) => {
      buf = Buffer.concat([buf, d])
      const len = readVarint(buf, 0)
      if (!len || buf.length < len[1] + len[0]) return
      const id = readVarint(buf, len[1])
      const strLen = id && readVarint(buf, id[1])
      if (!strLen) return done(new Error('Bad response'))
      try {
        const j = JSON.parse(buf.subarray(strLen[1], strLen[1] + strLen[0]).toString('utf8'))
        done(undefined, {
          online: j.players?.online ?? 0,
          max: j.players?.max ?? 0,
          motd: plain(j.description).trim().slice(0, 200),
          icon: typeof j.favicon === 'string' && j.favicon.startsWith('data:image/png;base64,') ? j.favicon : null,
          version: plain(j.version?.name ?? ''),
          pingMs: Date.now() - started
        })
      } catch (e) {
        done(e as Error)
      }
    })
  })
}
