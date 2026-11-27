// Cloud settings sync against a fake PandaClient server: upload after playing, download on another PC.
import http from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const PORT = 47125
process.env.TEST_ROOT = mkdtempSync(join(tmpdir(), 'pandaclient-sync-'))
process.env.PANDA_API = `http://127.0.0.1:${PORT}`
const ok = (m: string) => console.log('  ✓ ' + m)

// Fake server: one player's settings.
let cloud: { files: Record<string, string>; updatedAt: string | null } = { files: {}, updatedAt: null }
let puts = 0
const server = http.createServer((req, res) => {
  if (req.headers.authorization !== 'Bearer ' + 'a'.repeat(64)) return res.writeHead(401).end('{"error":"no"}')
  if (req.url === '/settings' && req.method === 'GET') return res.end(JSON.stringify(cloud))
  if (req.url === '/settings' && req.method === 'PUT') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      cloud = { files: JSON.parse(body).files, updatedAt: new Date().toISOString() }
      puts++
      res.end(JSON.stringify({ updatedAt: cloud.updatedAt }))
    })
    return
  }
  res.writeHead(404).end('{}')
})
await new Promise<void>((r) => server.listen(PORT, r))

// A signed-in account with a PandaClient session already set up.
const userData = join(process.env.TEST_ROOT, 'userData')
mkdirSync(userData, { recursive: true })
const b64 = (s: string) => 'b64:' + Buffer.from(s).toString('base64')
const uuid = '5094fdee-0b25-348e-811a-b7cb2010fd98'
writeFileSync(join(userData, 'accounts.json'), JSON.stringify({ active: uuid, accounts: [{ uuid, username: 'PandaTester', refresh: b64('r'), mc: { token: b64('mc-token'), exp: Date.now() + 86_400_000 }, panda: b64('a'.repeat(64)) }] }))

const settings = await import('../src/main/services/settings.ts')
const api = await import('../src/main/services/pandaApi.ts')
const game = settings.getSettings().gameDir
mkdirSync(game, { recursive: true })

// PC 1: played, settings saved by the mod -> uploaded once, not again when nothing changed.
writeFileSync(join(game, 'pandaclient-mod.json'), '{"hud":"layout-A"}')
writeFileSync(join(game, 'pandaclient-presence.json'), '{"server":"x"}')
assert.equal(await api.pushSettings(), true)
assert.deepEqual(Object.keys(cloud.files), ['pandaclient-mod.json'])
assert.equal(await api.pushSettings(), false)
assert.equal(puts, 1)
ok('after playing: settings uploaded (presence file left out), no upload when nothing changed')

// PC 2: a fresh PC with no settings -> they come down before launch.
rmSync(join(game, 'pandaclient-mod.json'))
rmSync(join(game, '.pandaclient-sync'))
assert.equal(await api.pullSettings(), true)
assert.equal(readFileSync(join(game, 'pandaclient-mod.json'), 'utf8'), '{"hud":"layout-A"}')
ok('new PC: settings downloaded before launch')

// Newer settings on this PC are never overwritten by an older cloud copy.
writeFileSync(join(game, 'pandaclient-mod.json'), '{"hud":"layout-B"}')
const future = new Date(Date.now() + 60_000)
utimesSync(join(game, 'pandaclient-mod.json'), future, future)
assert.equal(await api.pullSettings(), false)
assert.equal(readFileSync(join(game, 'pandaclient-mod.json'), 'utf8'), '{"hud":"layout-B"}')
ok('newer local settings kept')

// Turned off in Settings: nothing is sent.
settings.updateSettings({ cloudSync: false })
assert.equal(await api.pushSettings(), false)
assert.equal(puts, 1)
ok('sync off: nothing uploaded')

server.close()
console.log(existsSync(game) ? 'SYNC PASSED' : '')
process.exit(0)
