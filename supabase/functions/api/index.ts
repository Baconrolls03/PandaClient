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

/** Leave your party; the next player becomes leader, and a party of one is closed. */
async function leaveParty(uuid: string) {
  const { data: mine } = await db.from('party_members').select('party_id').eq('uuid', uuid).maybeSingle()
  if (!mine) return
  await db.from('party_members').delete().eq('uuid', uuid)
  await tidyParty(mine.party_id)
}

async function tidyParty(partyId: string) {
  const { data: rest } = await db.from('party_members').select('uuid').eq('party_id', partyId).order('joined_at')
  if (!rest || rest.length <= 1) { await db.from('parties').delete().eq('id', partyId); return }
  const { data: party } = await db.from('parties').select('leader').eq('id', partyId).maybeSingle()
  if (party && !rest.some((r) => r.uuid === party.leader)) await db.from('parties').update({ leader: rest[0].uuid }).eq('id', partyId)
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

    // ── Settings sync ──────────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/settings') {
      const { data } = await db.from('player_settings').select('files, updated_at').eq('uuid', me.uuid).maybeSingle()
      return json({ files: data?.files ?? {}, updatedAt: data?.updated_at ?? null })
    }
    if (req.method === 'PUT' && path === '/settings') {
      const { files } = await req.json().catch(() => ({}))
      if (typeof files !== 'object' || !files) return fail(400, 'Bad settings')
      const clean: Record<string, string> = {}
      let size = 0
      for (const [name, text] of Object.entries(files)) {
        if (!/^pandaclient[a-z0-9_.-]*\.json$/i.test(name) || typeof text !== 'string') continue
        size += text.length
        clean[name] = text
      }
      if (size > 512_000) return fail(413, 'Settings too large')
      const updatedAt = new Date().toISOString()
      await db.from('player_settings').upsert({ uuid: me.uuid, files: clean, updated_at: updatedAt })
      return json({ updatedAt })
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

    // ── Lobby parties ──────────────────────────────────────────────────────
    // A party is a group of friends who show up in each other's lobby (their characters stand beside yours).
    if (req.method === 'GET' && path === '/party') {
      const since = new Date(Date.now() - 10 * 60_000).toISOString()
      const { data: inv } = await db.from('party_invites').select('id, created_at, players!party_invites_from_uuid_fkey(username)').eq('to_uuid', me.uuid).eq('dismissed', false).gte('created_at', since).order('created_at', { ascending: false }).limit(5)
      const invites = (inv ?? []).map((r) => ({ id: r.id, createdAt: r.created_at, from: (r.players as { username: string } | null)?.username ?? 'A friend' }))
      const { data: mine } = await db.from('party_members').select('party_id').eq('uuid', me.uuid).maybeSingle()
      if (!mine) return json({ me: me.uuid, party: null, invites, messages: [] })
      const { data: party } = await db.from('parties').select('id, leader').eq('id', mine.party_id).maybeSingle()
      const { data: rows } = await db.from('party_members').select('uuid, joined_at, players(username, last_seen, server, server_at)').eq('party_id', mine.party_id).order('joined_at')
      const members = (rows ?? []).map((r) => {
        const p = r.players as { username: string; last_seen: string; server: string | null; server_at: string | null } | null
        return { uuid: r.uuid, username: p?.username ?? '?', leader: r.uuid === party?.leader, online: !!p && Date.now() - new Date(p.last_seen).getTime() < 3 * 60_000, server: p?.server ?? null, serverAt: p?.server_at ?? null }
      })
      // party chat: the last half hour (or only what's new after ?after=<id>)
      const after = Number(new URL(req.url).searchParams.get('after') ?? '0') || 0
      const chatSince = new Date(Date.now() - 30 * 60_000).toISOString()
      const { data: msgs } = await db.from('party_messages').select('id, from_uuid, text, created_at').eq('party_id', mine.party_id).gt('id', after).gte('created_at', chatSince).order('id', { ascending: false }).limit(40)
      const names = new Map(members.map((m) => [m.uuid, m.username]))
      const messages = (msgs ?? []).reverse().map((m) => ({ id: m.id, from: names.get(m.from_uuid) ?? 'Someone', fromUuid: m.from_uuid, text: m.text, at: m.created_at }))
      return json({ me: me.uuid, party: { id: mine.party_id, leader: party?.leader ?? null, members }, invites, messages })
    }

    // Party chat.
    if (req.method === 'POST' && path === '/party/chat') {
      const { text } = await req.json()
      const clean = typeof text === 'string' ? text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) : ''
      if (!clean) return fail(400, 'Type a message first')
      const { data: mine } = await db.from('party_members').select('party_id').eq('uuid', me.uuid).maybeSingle()
      if (!mine) return fail(400, "You're not in a party")
      const { count } = await db.from('party_messages').select('id', { count: 'exact', head: true }).eq('from_uuid', me.uuid).gte('created_at', new Date(Date.now() - 10_000).toISOString())
      if ((count ?? 0) >= 5) return fail(429, 'Slow down a little')
      await db.from('party_messages').insert({ party_id: mine.party_id, from_uuid: me.uuid, text: clean })
      return json({ ok: true })
    }

    // Where I am right now (the game reports it as soon as you join or leave a server), so the party can follow.
    if (req.method === 'POST' && path === '/party/presence') {
      const { server } = await req.json()
      const s = typeof server === 'string' && server.length <= 100 ? server : null
      await db.from('players').update({ last_seen: new Date().toISOString(), server: s, server_at: new Date().toISOString() }).eq('uuid', me.uuid)
      return json({ ok: true })
    }

    // The leader hands the crown to someone else in the party.
    if (req.method === 'POST' && path === '/party/promote') {
      const { uuid } = await req.json()
      if (typeof uuid !== 'string' || !UUID.test(uuid)) return fail(400, 'Bad request')
      const { data: party } = await db.from('parties').select('id').eq('leader', me.uuid).maybeSingle()
      if (!party) return fail(403, 'Only the party leader can do that')
      const { data: member } = await db.from('party_members').select('uuid').eq('uuid', uuid).eq('party_id', party.id).maybeSingle()
      if (!member) return fail(404, "They're not in your party")
      await db.from('parties').update({ leader: uuid }).eq('id', party.id)
      return json({ ok: true })
    }

    if (req.method === 'POST' && path === '/party/invite') {
      const { to } = await req.json()
      if (typeof to !== 'string' || !UUID.test(to)) return fail(400, 'Bad request')
      const { data: f } = await db.from('friends').select('status').or(`and(a.eq.${me.uuid},b.eq.${to}),and(a.eq.${to},b.eq.${me.uuid})`).eq('status', 'accepted').maybeSingle()
      if (!f) return fail(403, 'You can only invite friends')
      let { data: mine } = await db.from('party_members').select('party_id').eq('uuid', me.uuid).maybeSingle()
      if (!mine) {
        const { data: created } = await db.from('parties').insert({ leader: me.uuid }).select('id').single()
        await db.from('party_members').insert({ uuid: me.uuid, party_id: created!.id })
        mine = { party_id: created!.id }
      }
      const { count } = await db.from('party_members').select('uuid', { count: 'exact', head: true }).eq('party_id', mine.party_id)
      if ((count ?? 0) >= 8) return fail(400, 'Your party is full (8 players)')
      await db.from('party_invites').insert({ party_id: mine.party_id, from_uuid: me.uuid, to_uuid: to })
      return json({ ok: true })
    }

    if (req.method === 'POST' && path === '/party/accept') {
      const { id } = await req.json()
      if (typeof id !== 'string' || !UUID.test(id)) return fail(400, 'Bad request')
      const since = new Date(Date.now() - 10 * 60_000).toISOString()
      const { data: inv } = await db.from('party_invites').select('party_id').eq('id', id).eq('to_uuid', me.uuid).eq('dismissed', false).gte('created_at', since).maybeSingle()
      if (!inv) return fail(404, 'That invite has expired')
      const { count } = await db.from('party_members').select('uuid', { count: 'exact', head: true }).eq('party_id', inv.party_id)
      if ((count ?? 0) >= 8) return fail(400, 'That party is full')
      await leaveParty(me.uuid)
      await db.from('party_members').insert({ uuid: me.uuid, party_id: inv.party_id })
      await db.from('party_invites').update({ dismissed: true }).eq('id', id)
      return json({ ok: true })
    }

    if (req.method === 'POST' && path === '/party/decline') {
      const { id } = await req.json()
      if (typeof id !== 'string' || !UUID.test(id)) return fail(400, 'Bad request')
      await db.from('party_invites').update({ dismissed: true }).eq('id', id).eq('to_uuid', me.uuid)
      return json({ ok: true })
    }

    if (req.method === 'POST' && path === '/party/leave') {
      await leaveParty(me.uuid)
      return json({ ok: true })
    }

    if (req.method === 'POST' && path === '/party/kick') {
      const { uuid } = await req.json()
      if (typeof uuid !== 'string' || !UUID.test(uuid) || uuid === me.uuid) return fail(400, 'Bad request')
      const { data: party } = await db.from('parties').select('id').eq('leader', me.uuid).maybeSingle()
      if (!party) return fail(403, 'Only the party leader can remove players')
      await db.from('party_members').delete().eq('uuid', uuid).eq('party_id', party.id)
      await tidyParty(party.id)
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
