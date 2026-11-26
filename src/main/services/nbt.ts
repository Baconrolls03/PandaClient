// Minimal NBT (Named Binary Tag) reader/writer: enough for level.dat and servers.dat.

export const T = { End: 0, Byte: 1, Short: 2, Int: 3, Long: 4, Float: 5, Double: 6, ByteArray: 7, String: 8, List: 9, Compound: 10, IntArray: 11, LongArray: 12 } as const

export type Tag =
  | { type: 1 | 2 | 3 | 5 | 6; value: number }
  | { type: 4; value: bigint }
  | { type: 7; value: Int8Array }
  | { type: 8; value: string }
  | { type: 9; listType: number; value: Tag[] }
  | { type: 10; value: Record<string, Tag> }
  | { type: 11; value: Int32Array }
  | { type: 12; value: BigInt64Array }

export function readNbt(buf: Uint8Array): { name: string; root: Extract<Tag, { type: 10 }> } {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let o = 0
  const str = () => {
    const len = view.getUint16(o)
    o += 2
    const s = new TextDecoder().decode(buf.subarray(o, o + len))
    o += len
    return s
  }
  const payload = (type: number): Tag => {
    switch (type) {
      case 1: return { type, value: view.getInt8(o++) }
      case 2: { const value = view.getInt16(o); o += 2; return { type, value } }
      case 3: { const value = view.getInt32(o); o += 4; return { type, value } }
      case 4: { const value = view.getBigInt64(o); o += 8; return { type, value } }
      case 5: { const value = view.getFloat32(o); o += 4; return { type, value } }
      case 6: { const value = view.getFloat64(o); o += 8; return { type, value } }
      case 7: { const n = view.getInt32(o); o += 4; const value = new Int8Array(buf.slice(o, o + n)); o += n; return { type, value } }
      case 8: return { type, value: str() }
      case 9: {
        const listType = view.getInt8(o++)
        const n = view.getInt32(o)
        o += 4
        const value: Tag[] = []
        for (let i = 0; i < n; i++) value.push(payload(listType))
        return { type, listType, value }
      }
      case 10: {
        const value: Record<string, Tag> = {}
        for (;;) {
          const t = view.getInt8(o++)
          if (t === 0) break
          const name = str()
          value[name] = payload(t)
        }
        return { type, value }
      }
      case 11: { const n = view.getInt32(o); o += 4; const value = new Int32Array(n); for (let i = 0; i < n; i++, o += 4) value[i] = view.getInt32(o); return { type, value } }
      case 12: { const n = view.getInt32(o); o += 4; const value = new BigInt64Array(n); for (let i = 0; i < n; i++, o += 8) value[i] = view.getBigInt64(o); return { type, value } }
      default:
        throw new Error(`Bad NBT tag type ${type}`)
    }
  }
  const t = view.getInt8(o++)
  if (t !== 10) throw new Error('NBT root is not a compound')
  const name = str()
  return { name, root: payload(10) as Extract<Tag, { type: 10 }> }
}

export function writeNbt(root: Extract<Tag, { type: 10 }>, name = ''): Uint8Array {
  const parts: Uint8Array[] = []
  const num = (bytes: number, set: (v: DataView) => void) => {
    const b = new Uint8Array(bytes)
    set(new DataView(b.buffer))
    parts.push(b)
  }
  const str = (s: string) => {
    const enc = new TextEncoder().encode(s)
    num(2, (v) => v.setUint16(0, enc.length))
    parts.push(enc)
  }
  const payload = (tag: Tag) => {
    switch (tag.type) {
      case 1: return num(1, (v) => v.setInt8(0, tag.value))
      case 2: return num(2, (v) => v.setInt16(0, tag.value))
      case 3: return num(4, (v) => v.setInt32(0, tag.value))
      case 4: return num(8, (v) => v.setBigInt64(0, tag.value))
      case 5: return num(4, (v) => v.setFloat32(0, tag.value))
      case 6: return num(8, (v) => v.setFloat64(0, tag.value))
      case 7: num(4, (v) => v.setInt32(0, tag.value.length)); return parts.push(new Uint8Array(tag.value.buffer.slice(0)))
      case 8: return str(tag.value)
      case 9:
        num(1, (v) => v.setInt8(0, tag.value.length ? tag.listType : 0))
        num(4, (v) => v.setInt32(0, tag.value.length))
        return tag.value.forEach(payload)
      case 10:
        for (const [k, child] of Object.entries(tag.value)) {
          num(1, (v) => v.setInt8(0, child.type))
          str(k)
          payload(child)
        }
        return num(1, (v) => v.setInt8(0, 0))
      case 11: num(4, (v) => v.setInt32(0, tag.value.length)); return tag.value.forEach((x) => num(4, (v) => v.setInt32(0, x)))
      case 12: num(4, (v) => v.setInt32(0, tag.value.length)); return tag.value.forEach((x) => num(8, (v) => v.setBigInt64(0, x)))
    }
  }
  num(1, (v) => v.setInt8(0, 10))
  str(name)
  payload(root)
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
