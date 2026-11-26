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
      await db.from('players').update({ last_seen: new Date().toISOString() }).eq('uuid', me.uuid)
      return json({ online: await onlineCount() })
    }

    return fail(404, 'Not found')
  } catch (e) {
    console.error(e)
    return fail(500, 'Server error')
  }
})
