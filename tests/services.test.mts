// Runs the main-process services against a local fake Modrinth server (no Electron, no network).
// npm test
import http from 'node:http'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { zipSync, unzipSync } from 'fflate'
import assert from 'node:assert/strict'

const PORT = 47123
const BASE = `http://127.0.0.1:${PORT}`
process.env.PANDA_MODRINTH_API = `${BASE}/v2`
process.env.TEST_ROOT ??= mkdtempSync(join(tmpdir(), 'pandaclient-test-'))

const sha1 = (b: Uint8Array) => createHash('sha1').update(b).digest('hex')
const files = new Map<string, Uint8Array>()
const mkFile = (name: string, text: string) => {
  const data = new TextEncoder().encode(text)
  files.set(name, data)
  return { hashes: { sha1: sha1(data), sha512: '' }, url: `${BASE}/files/${name}`, filename: name, primary: true, size: data.length }
}
const project = (id: string, slug: string, title: string, type = 'mod', loaders = ['fabric']) => ({
  id, slug, title, project_type: type, team: 't', description: '', body: '', categories: [], client_side: 'required', server_side: 'optional',
  downloads: 1, followers: 1, icon_url: null, gallery: [], versions: [], game_versions: ['1.21.1'], loaders,
  issues_url: null, source_url: null, wiki_url: null, discord_url: null, published: '', updated: ''
})
const ver = (id: string, pid: string, num: string, date: string, file: any, deps: any[] = [], loaders = ['fabric'], gv = ['1.21.1']) => ({
  id, project_id: pid, name: num, version_number: num, changelog: '', dependencies: deps, game_versions: gv, version_type: 'release',
  loaders, featured: false, date_published: date, downloads: 0, files: [file]
})

const projects = [
  project('P_FAPI', 'fabric-api', 'Fabric API'),
  project('P_SOD', 'sodium', 'Sodium'),
  project('P_LITH', 'lithium', 'Lithium'),
  project('P_IRIS', 'iris', 'Iris'),
  project('P_PACK', 'testpack', 'Test Pack', 'modpack'),
  project('P_EVIL', 'evilpack', 'Evil Pack', 'modpack'),
  project('P_RP', 'faithful', 'Faithful', 'resourcepack', ['minecraft'])
]
const sodiumDep = [{ project_id: 'P_SOD', version_id: null, file_name: null, dependency_type: 'required' }]
const versions: any[] = [
  ver('V_FAPI1', 'P_FAPI', '0.100.0', '2024-08-01', mkFile('fabric-api-0.100.jar', 'fapi')),
  ver('V_SOD1', 'P_SOD', '0.5.0', '2024-08-01', mkFile('sodium-0.5.0.jar', 'sodium')),
  // lithium only exists for 1.20.1 → should be skipped
  ver('V_LITH1', 'P_LITH', '0.11', '2024-01-01', mkFile('lithium-0.11.jar', 'lith'), [], ['fabric'], ['1.20.1']),
  ver('V_IRIS1', 'P_IRIS', '1.7.0', '2024-06-01', mkFile('iris-1.7.0.jar', 'iris old'), sodiumDep),
  ver('V_IRIS2', 'P_IRIS', '1.8.0', '2024-09-01', mkFile('iris-1.8.0.jar', 'iris new'), sodiumDep),
  ver('V_RP1', 'P_RP', '1.0', '2024-09-01', mkFile('faithful.zip', 'rp'), [], ['minecraft'])
]

// Modpack: one client file, one server-only file, overrides + client-overrides
const packIndex = {
  formatVersion: 1, game: 'minecraft', versionId: '1', name: 'Test Pack',
  files: [
    { path: 'mods/sodium-0.5.0.jar', hashes: { sha1: sha1(files.get('sodium-0.5.0.jar')!) }, downloads: [`${BASE}/files/sodium-0.5.0.jar`], env: { client: 'required', server: 'required' } },
    { path: 'mods/serveronly.jar', hashes: { sha1: 'x' }, downloads: [`${BASE}/files/nope`], env: { client: 'unsupported', server: 'required' } }
  ],
  dependencies: { minecraft: '1.21.1', 'fabric-loader': '0.16.5' }
}
const enc = (s: string) => new TextEncoder().encode(s)
const pack = zipSync({
  'modrinth.index.json': enc(JSON.stringify(packIndex)),
  'overrides/config/sodium.json': enc('{"a":1}'),
  'client-overrides/options.txt': enc('fov:90')
})
const evil = zipSync({ 'modrinth.index.json': enc(JSON.stringify({ ...packIndex, name: 'Evil', files: [{ ...packIndex.files[0], path: '../../escaped.jar' }] })) })
for (const [name, data, vid, pid] of [['testpack.mrpack', pack, 'V_PACK1', 'P_PACK'], ['evil.mrpack', evil, 'V_EVIL1', 'P_EVIL']] as const) {
  files.set(name, data)
  versions.push(ver(vid, pid, '1.0', '2024-09-01', { hashes: { sha1: sha1(data), sha512: '' }, url: `${BASE}/files/${name}`, filename: name, primary: true, size: data.length }))
}

const findP = (k: string) => projects.find((p) => p.id === k || p.slug === k)
const byHash = (h: string) => versions.find((v) => v.files[0].hashes.sha1 === h)
const json = (res: http.ServerResponse, v: unknown, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json' })
  res.end(JSON.stringify(v))
}
let lastUA = ''
const server = http.createServer(async (req, res) => {
  lastUA = String(req.headers['user-agent'])
  const u = new URL(req.url!, BASE)
  const body = await new Promise<string>((r) => {
    let b = ''
    req.on('data', (c) => (b += c))
    req.on('end', () => r(b))
  })
  const p = u.pathname
  let m: RegExpMatchArray | null
  if ((m = p.match(/^\/files\/(.+)$/))) {
    const f = files.get(m[1])
    if (!f) return json(res, {}, 404)
    res.writeHead(200, { 'content-length': f.length })
    return res.end(f)
  }
  if ((m = p.match(/^\/v2\/project\/([^/]+)\/version$/))) {
    const proj = findP(decodeURIComponent(m[1]))
    if (!proj) return json(res, {}, 404)
    const loaders = u.searchParams.get('loaders') ? JSON.parse(u.searchParams.get('loaders')!) : null
    const gv = u.searchParams.get('game_versions') ? JSON.parse(u.searchParams.get('game_versions')!) : null
    return json(res, versions.filter((v) => v.project_id === proj.id && (!loaders || v.loaders.some((l: string) => loaders.includes(l))) && (!gv || v.game_versions.some((g: string) => gv.includes(g)))))
  }
  if ((m = p.match(/^\/v2\/project\/([^/]+)$/))) {
    const proj = findP(decodeURIComponent(m[1]))
    return proj ? json(res, proj) : json(res, {}, 404)
  }
  if ((m = p.match(/^\/v2\/version\/([^/]+)$/))) {
    const v = versions.find((x) => x.id === m![1])
    return v ? json(res, v) : json(res, {}, 404)
  }
  if (p === '/v2/projects') return json(res, JSON.parse(u.searchParams.get('ids')!).map(findP).filter(Boolean))
  if (p === '/v2/versions') return json(res, versions.filter((v) => JSON.parse(u.searchParams.get('ids')!).includes(v.id)))
  if (p === '/v2/version_files' && req.method === 'POST') {
    const { hashes } = JSON.parse(body)
    const out: any = {}
    for (const h of hashes) if (byHash(h)) out[h] = byHash(h)
    return json(res, out)
  }
  if (p === '/v2/version_files/update' && req.method === 'POST') {
    const { hashes, loaders, game_versions } = JSON.parse(body)
    const out: any = {}
    for (const h of hashes) {
      const v = byHash(h)
      if (!v) continue
      const c = versions
        .filter((x) => x.project_id === v.project_id && x.loaders.some((l: string) => loaders.includes(l)) && x.game_versions.some((g: string) => game_versions.includes(g)))
        .sort((a, b) => b.date_published.localeCompare(a.date_published))
      if (c[0]) out[h] = c[0]
    }
    return json(res, out)
  }
  json(res, { error: 'not found ' + p }, 404)
})
await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', r))

const SRC = '../src/main/services'
const settings = await import(`${SRC}/settings.ts`)
settings.updateSettings({ gameDir: process.env.TEST_ROOT + '/game' })
const instances = await import(`${SRC}/instances.ts`)
const content = await import(`${SRC}/content.ts`)
const mrpack = await import(`${SRC}/mrpack.ts`)
const ifiles = await import(`${SRC}/instanceFiles.ts`)
const paths = await import(`${SRC}/paths.ts`)
const nbt = await import(`${SRC}/nbt.ts`)
const tasks = await import(`${SRC}/tasks.ts`)

const ok = (msg: string) => console.log('  ✓', msg)

// 1. create + performance pack
const inst = await instances.createInstance({ name: 'My Fabric', mcVersion: '1.21.1', loader: 'fabric', loaderVersion: '0.16.5' })
assert.equal(inst.id, 'my-fabric')
ok('instance created with slug id')
const skipped = await content.installMany(inst.id, content.PERFORMANCE_PACK, 'perf')
assert.deepEqual(skipped, ['lithium'])
ok('perf pack installed, lithium skipped (no 1.21.1 version)')
assert.match(lastUA, /^PandaClient\/0\.1\.0/)
ok('User-Agent sent: ' + lastUA)
let items = await content.listContent(inst.id)
assert.deepEqual(items.map((i: any) => i.project?.title), ['Fabric API', 'Iris', 'Sodium'])
ok('content identified via hashes: ' + items.map((i: any) => i.file).join(', '))

// 2. older iris → update check → update
await content.installProject(inst.id, 'iris', 'V_IRIS1')
items = await content.listContent(inst.id)
assert.ok(items.some((i: any) => i.file === 'iris-1.7.0.jar') && !items.some((i: any) => i.file === 'iris-1.8.0.jar'))
ok('installing a specific version replaces the old file')
items = await content.checkUpdates(inst.id)
const irisItem = items.find((i: any) => i.project?.slug === 'iris')
assert.equal(irisItem.update?.number, '1.8.0')
ok('update detected: iris 1.7.0 → 1.8.0')
await content.toggleContent(inst.id, irisItem.file, 'mod')
await content.updateContent(inst.id, [{ file: irisItem.file + '.disabled', type: 'mod' }])
items = await content.listContent(inst.id)
const ir = items.find((i: any) => i.project?.slug === 'iris')
assert.equal(ir.file, 'iris-1.8.0.jar.disabled')
assert.equal(ir.enabled, false)
assert.equal(ir.update, null)
ok('update applied and disabled state kept: ' + ir.file)
await content.toggleContent(inst.id, ir.file, 'mod')
assert.ok(existsSync(inst.path + '/mods/iris-1.8.0.jar'))
ok('toggle re-enables')
await assert.rejects(content.toggleContent(inst.id, '../instance.json', 'mod'))
ok('toggle rejects path traversal')

// 3. resource pack goes to resourcepacks/
await content.installProject(inst.id, 'faithful')
assert.ok(existsSync(inst.path + '/resourcepacks/faithful.zip'))
ok('resource pack installed into resourcepacks/')

// 4. vanilla instance can't take fabric mods
const van = await instances.createInstance({ name: 'Vanilla', mcVersion: '1.21.1', loader: 'vanilla', loaderVersion: null })
await assert.rejects(content.installProject(van.id, 'sodium'), /no version for Vanilla/)
ok('vanilla instance refuses Fabric mod with clear error')

// 5. modpack
const packInst = await mrpack.installModpack('testpack')
assert.equal(packInst.loader, 'fabric')
assert.equal(packInst.loaderVersion, '0.16.5')
assert.equal(packInst.modpack?.projectId, 'P_PACK')
assert.ok(existsSync(packInst.path + '/mods/sodium-0.5.0.jar'))
assert.ok(!existsSync(packInst.path + '/mods/serveronly.jar'))
assert.equal(readFileSync(packInst.path + '/config/sodium.json', 'utf8'), '{"a":1}')
assert.equal(readFileSync(packInst.path + '/options.txt', 'utf8'), 'fov:90')
ok('modpack installed: files downloaded, server-only skipped, overrides + client-overrides applied')
await assert.rejects(mrpack.installModpack('evilpack'), /Unsafe path/)
assert.ok(!existsSync(process.env.TEST_ROOT + '/game/escaped.jar')); assert.ok(!existsSync(process.env.TEST_ROOT + '/game/instances/evil'))
ok('modpack with ../ path rejected')

// 6. export / re-import
const out = await mrpack.exportMrpack(inst.id)
const z = unzipSync(new Uint8Array(readFileSync(out!)))
const idx = JSON.parse(new TextDecoder().decode(z['modrinth.index.json']))
assert.equal(idx.dependencies['fabric-loader'], '0.16.5')
assert.equal(idx.files.length, 4)
ok('export .mrpack: ' + idx.files.map((f: any) => f.path).join(', '))
const re = await mrpack.importMrpack(out!)
assert.ok(existsSync(re.path + '/mods/iris-1.8.0.jar'))
ok('re-import of exported pack works')

// 7. worlds + servers (NBT)
const lvl = nbt.writeNbt({ type: 10, value: { Data: { type: 10, value: { LevelName: { type: 8, value: 'My World ✨' }, LastPlayed: { type: 4, value: 1700000000000n }, GameType: { type: 3, value: 1 } } } } })
mkdirSync(inst.path + '/saves/world1', { recursive: true })
writeFileSync(inst.path + '/saves/world1/level.dat', gzipSync(lvl))
const worlds = await ifiles.listWorlds(inst.id)
assert.deepEqual([worlds[0].name, worlds[0].gameMode, worlds[0].lastPlayed], ['My World ✨', 'Creative', 1700000000000])
ok('level.dat parsed: ' + JSON.stringify(worlds[0]))
await ifiles.addServer(inst.id, { name: 'Hypixel', ip: 'mc.hypixel.net' })
const servers = await ifiles.addServer(inst.id, { name: 'Local', ip: 'localhost' })
assert.deepEqual(servers.map((s: any) => s.ip), ['mc.hypixel.net', 'localhost'])
await ifiles.removeServer(inst.id, 0)
assert.deepEqual((await ifiles.listServers(inst.id)).map((s: any) => s.name), ['Local'])
ok('servers.dat add/remove round-trips')

// 8. files + logs + safety
await ifiles.writeTextFile(inst.id, 'config/test.json', '{}')
assert.equal(await ifiles.readTextFile(inst.id, 'config/test.json'), '{}')
await assert.rejects(ifiles.readTextFile(inst.id, '../../userData/settings.json'), /Unsafe/)
await assert.rejects(ifiles.writeTextFile(inst.id, 'mods/x.jar', 'x'), /text files/)
mkdirSync(inst.path + '/logs', { recursive: true })
writeFileSync(inst.path + '/logs/latest.log', 'hello')
writeFileSync(inst.path + '/logs/old.log.gz', gzipSync('old log'))
const logs = await ifiles.listLogs(inst.id)
assert.equal(await ifiles.readLog(inst.id, 'logs/old.log.gz'), 'old log')
ok(`files + logs ok (${logs.length} logs), traversal blocked`)
assert.throws(() => instances.instanceDir('../evil'))
assert.throws(() => paths.safeJoin('/a', 'C:/x'))
ok('id / path validation')

// 9. duplicate / remove / list
const dup = await instances.duplicateInstance(inst.id)
assert.ok(existsSync(dup.path + '/mods/sodium-0.5.0.jar'))
await instances.removeInstance(dup.id)
assert.ok(!existsSync(dup.path))
ok('instances: ' + (await instances.listInstances()).map((i: any) => i.id).join(', '))
console.log('  tasks:', tasks.listTasks().map((t: any) => `${t.status}:${t.title}`).join(' | '))
server.close()
console.log('ALL PASSED')
process.exit(0)
