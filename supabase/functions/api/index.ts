// PandaClient API (Supabase Edge Function "api").
// Identity: Mojang's join/hasJoined check — the player's Minecraft token only ever goes to Mojang.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const CATEGORIES = ['cape', 'hat', 'mask', 'bandana', 'glasses', 'wings', 'backpack']
const SESSION_DAYS = 30
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const fail = (status: number, error: string) => json({ error }, status)

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))))
const dashed = (id: string) => id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

async function sessionPlayer(req: Request): Promise<{ uuid: string; username: string } | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || token.length !== 64) return null
  const { data } = await db.from('sessions').select('uuid, expires_at, players(username)').eq('token_hash', await sha256(token)).maybeSingle()
  if (!data || new Date(data.expires_at) < new Date()) return null
  return { uuid: data.uuid, username: (data.players as { username: string } | null)?.username ?? '' }
}

async function onlineCount(): Promise<number> {
  const { data } = await db.rpc('online_count')
  return (data as number) ?? 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const path = new URL(req.url).pathname.replace(/^.*\/api/, '') || '/'

  try {
    // 1) Start sign-in: a one-time server id the launcher "joins" with Mojang.
    if (req.method === 'POST' && path === '/auth/challenge') {
      await db.from('challenges').delete().lt('created_at', new Date(Date.now() - 5 * 60_000).toISOString())
      const serverId = hex(crypto.getRandomValues(new Uint8Array(20)))
      await db.from('challenges').insert({ server_id: serverId })
      return json({ serverId })
    }

    // 2) Finish sign-in: ask Mojang whether this username joined with that server id.
    if (req.method === 'POST' && path === '/auth/verify') {
      const { username, serverId } = await req.json()
      if (typeof username !== 'string' || typeof serverId !== 'string' || !/^\w{1,16}$/.test(username)) return fail(400, 'Bad request')
      const { data: challenge } = await db.from('challenges').delete().eq('server_id', serverId).select().maybeSingle()
      if (!challenge) return fail(400, 'Challenge expired, try again')
      const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/hasJoined?username=${encodeURIComponent(username)}&serverId=${serverId}`)
      if (res.status !== 200) return fail(401, "Mojang couldn't confirm this account")
      const profile = (await res.json()) as { id: string; name: string }
      const uuid = dashed(profile.id)
      await db.from('players').upsert({ uuid, username: profile.name, last_seen: new Date().toISOString() })
      await db.from('loadouts').upsert({ uuid }, { onConflict: 'uuid', ignoreDuplicates: true })
      const token = hex(crypto.getRandomValues(new Uint8Array(32)))
      await db.from('sessions').insert({ token_hash: await sha256(token), uuid, expires_at: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString() })
      return json({ token, uuid, username: profile.name })
    }

    // Public: the cosmetics catalogue.
    if (req.method === 'GET' && path === '/cosmetics') {
      const { data } = await db.from('cosmetics').select('id, name, category, rarity, model').order('sort')
      return new Response(JSON.stringify(data ?? []), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } })
    }

    // Public: live online count.
    if (req.method === 'GET' && path === '/online') return json({ online: await onlineCount() })

    // Public: what these players are wearing (the in-game mod asks for nearby players).
    if (req.method === 'GET' && path === '/loadouts') {
      const ids = (new URL(req.url).searchParams.get('uuids') ?? '').split(',').filter((u) => UUID.test(u)).slice(0, 100).map((u) => dashed(u.replace(/-/g, '')))
      if (!ids.length) return json([])
      const { data } = await db.from('loadouts').select('uuid, equipped').in('uuid', ids)
      return json(data ?? [])
    }

    // Everything below needs a PandaClient session.
    const me = await sessionPlayer(req)
    if (!me) return fail(401, 'Not signed in to PandaClient')

    if (req.method === 'GET' && path === '/me') {
      const { data } = await db.from('loadouts').select('equipped').eq('uuid', me.uuid).maybeSingle()
      return json({ ...me, equipped: data?.equipped ?? {} })
    }

    if ((req.method === 'PUT' || req.method === 'POST') && path === '/loadout') {
      const { equipped } = await req.json()
      if (typeof equipped !== 'object' || !equipped) return fail(400, 'Bad loadout')
      const clean: Record<string, string> = {}
      const ids = Object.entries(equipped).filter(([cat, id]) => CATEGORIES.includes(cat) && typeof id === 'string')
      if (ids.length) {
        const { data: known } = await db.from('cosmetics').select('id, category').in('id', ids.map(([, id]) => id as string))
        for (const [cat, id] of ids) if (known?.some((k) => k.id === id && k.category === cat)) clean[cat] = id as string
      }
      await db.from('loadouts').upsert({ uuid: me.uuid, equipped: clean, updated_at: new Date().toISOString() })
      return json({ equipped: clean })
    }

    if (req.method === 'POST' && path === '/heartbeat') {
      const body = await req.json().catch(() => ({}))
      const server = typeof body.server === 'string' && body.server.length <= 100 ? body.server : null
      await db.from('players').update({ last_seen: new Date().toISOString(), server, server_at: new Date().toISOString() }).eq('uuid', me.uuid)
      return json({ online: await onlineCount() })
    }

    // ── Friends ────────────────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/friends') {
      const { data: rows } = await db.from('friends').select('a, b, status').or(`a.eq.${me.uuid},b.eq.${me.uuid}`)
      const others = (rows ?? []).map((r) => (r.a === me.uuid ? r.b : r.a))
      if (!others.length) return json([])
      const { data: players } = await db.from('players').select('uuid, username, last_seen, server').in('uuid', others)
      const byId = new Map((players ?? []).map((p) => [p.uuid, p]))
      return json(
        (rows ?? []).map((r) => {
          const other = r.a === me.uuid ? r.b : r.a
          const p = byId.get(other)
          const online = !!p && Date.now() - new Date(p.last_seen).getTime() < 3 * 60_000
          const status = r.status === 'accepted' ? 'friends' : r.a === me.uuid ? 'outgoing' : 'incoming'
          return { uuid: other, username: p?.username ?? '?', status, online, server: status === 'friends' && online ? p?.server ?? null : null }
        })
      )
    }

    if (req.method === 'POST' && path === '/friends/add') {
      const { username } = await req.json()
      if (typeof username !== 'string' || !/^\w{1,16}$/.test(username)) return fail(400, 'Enter a Minecraft username')
      const { data: p } = await db.from('players').select('uuid, username').ilike('username', username.replace(/_/g, '\\_')).maybeSingle()
      if (!p) return fail(404, `${username} hasn't used PandaClient yet`)
      if (p.uuid === me.uuid) return fail(400, "That's you!")
      const { data: back } = await db.from('friends').select('status').eq('a', p.uuid).eq('b', me.uuid).maybeSingle()
      if (back) {
        await db.from('friends').update({ status: 'accepted' }).eq('a', p.uuid).eq('b', me.uuid)
        return json({ status: 'friends', username: p.username })
      }
      await db.from('friends').upsert({ a: me.uuid, b: p.uuid }, { onConflict: 'a,b', ignoreDuplicates: true })
      return json({ status: 'outgoing', username: p.username })
    }

    if (req.method === 'POST' && path === '/friends/accept') {
      const { uuid } = await req.json()
      if (typeof uuid !== 'string' || !UUID.test(uuid)) return fail(400, 'Bad request')
      await db.from('friends').update({ status: 'accepted' }).eq('a', uuid).eq('b', me.uuid)
      return json({ ok: true })
    }

    if (req.method === 'POST' && path === '/friends/remove') {
      const { uuid } = await req.json()
      if (typeof uuid !== 'string' || !UUID.test(uuid)) return fail(400, 'Bad request')
      await db.from('friends').delete().eq('a', me.uuid).eq('b', uuid)
      await db.from('friends').delete().eq('a', uuid).eq('b', me.uuid)
      return json({ ok: true })
    }

    // ── Party invites ──────────────────────────────────────────────────────
    if (req.method === 'POST' && path === '/invites') {
      const { to, server } = await req.json()
      if (typeof to !== 'string' || !UUID.test(to) || typeof server !== 'string' || !/^[\w.-]{1,100}(:\d{1,5})?$/.test(server)) return fail(400, 'Bad request')
      const { data: f } = await db.from('friends').select('status').or(`and(a.eq.${me.uuid},b.eq.${to}),and(a.eq.${to},b.eq.${me.uuid})`).eq('status', 'accepted').maybeSingle()
      if (!f) return fail(403, 'You can only invite friends')
      await db.from('invites').insert({ from_uuid: me.uuid, to_uuid: to, server })
      return json({ ok: true })
    }

    if (req.method === 'GET' && path === '/invites') {
      const since = new Date(Date.now() - 10 * 60_000).toISOString()
      const { data } = await db.from('invites').select('id, server, created_at, players!invites_from_uuid_fkey(username)').eq('to_uuid', me.uuid).eq('dismissed', false).gte('created_at', since).order('created_at', { ascending: false }).limit(5)
      return json((data ?? []).map((r) => ({ id: r.id, server: r.server, createdAt: r.created_at, from: (r.players as { username: string } | null)?.username ?? 'A friend' })))
    }

    if (req.method === 'POST' && path === '/invites/dismiss') {
      const { id } = await req.json()
      if (typeof id !== 'string' || !UUID.test(id)) return fail(400, 'Bad request')
      await db.from('invites').update({ dismissed: true }).eq('id', id).eq('to_uuid', me.uuid)
      return json({ ok: true })
    }

    // ── Sharing mod instances ──────────────────────────────────────────────
    // Find PandaClient players by name (to pick who to share with).
    if (req.method === 'GET' && path === '/players') {
      const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
      if (!/^\w{1,16}$/.test(q)) return json([])
      const { data } = await db.from('players').select('uuid, username, last_seen').ilike('username', `${q}%`).neq('uuid', me.uuid).order('last_seen', { ascending: false }).limit(10)
      return json((data ?? []).map((p) => ({ uuid: p.uuid, username: p.username, online: Date.now() - new Date(p.last_seen).getTime() < 3 * 60_000 })))
    }

    // Start a share: create the rows and hand back a one-time upload URL for the .mrpack.
    if (req.method === 'POST' && path === '/shares') {
      const { to, name, size } = await req.json()
      if (!Array.isArray(to) || !to.length || to.length > 20 || typeof name !== 'string' || typeof size !== 'number') return fail(400, 'Bad request')
      if (size > 100 * 1024 * 1024) return fail(413, 'That instance is too big to share (over 100 MB). Try Download instead.')
      const ids = to.filter((u) => typeof u === 'string' && UUID.test(u)).map((u: string) => dashed(u.replace(/-/g, '')))
      const { data: known } = await db.from('players').select('uuid').in('uuid', ids)
      if (!known?.length) return fail(400, 'Those players have not used PandaClient yet')
      const file = `${me.uuid}/${crypto.randomUUID()}.mrpack`
      const { data: up, error } = await db.storage.from('shares').createSignedUploadUrl(file)
      if (error || !up) throw error ?? new Error('upload url')
      await db.from('shares').insert(known.map((k) => ({ from_uuid: me.uuid, to_uuid: k.uuid, name: name.slice(0, 80), size, path: file })))
      return json({ uploadUrl: up.signedUrl, path: file, recipients: known.length })
    }

    // The upload finished: let the recipients see it.
    if (req.method === 'POST' && path === '/shares/ready') {
      const { path: file } = await req.json()
      if (typeof file !== 'string' || !file.startsWith(`${me.uuid}/`)) return fail(400, 'Bad request')
      await db.from('shares').update({ ready: true }).eq('path', file).eq('from_uuid', me.uuid)
      return json({ ok: true })
    }

    // Instances shared with me (with a short-lived download link).
    if (req.method === 'GET' && path === '/shares') {
      const { data } = await db.from('shares').select('id, name, size, path, created_at, players!shares_from_uuid_fkey(username)')
        .eq('to_uuid', me.uuid).eq('ready', true).eq('dismissed', false).order('created_at', { ascending: false }).limit(20)
      const out = []
      for (const r of data ?? []) {
        const { data: signed } = await db.storage.from('shares').createSignedUrl(r.path, 3600)
        if (!signed) continue
        out.push({ id: r.id, name: r.name, size: r.size, createdAt: r.created_at, from: (r.players as { username: string } | null)?.username ?? 'Someone', url: signed.signedUrl })
      }
      return json(out)
    }

    if (req.method === 'POST' && path === '/shares/dismiss') {
      const { id } = await req.json()
      if (typeof id !== 'string' || !UUID.test(id)) return fail(400, 'Bad request')
      await db.from('shares').update({ dismissed: true }).eq('id', id).eq('to_uuid', me.uuid)
      return json({ ok: true })
    }

    return fail(404, 'Not found')
  } catch (e) {
    console.error(e)
    return fail(500, 'Server error')
  }
})
