// Import from other launchers: builds fake Modrinth / CurseForge / Prism / Lunar / Feather / Dawn / .minecraft
// folders with real-format mod jars and checks detection, Fabric-only filtering and copying.
import http from 'node:http'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { zipSync } from 'fflate'

const ROOT = (process.env.TEST_ROOT ??= mkdtempSync(join(tmpdir(), 'pandaclient-import-')))
process.env.HOME = join(ROOT, 'home')
process.env.USERPROFILE = process.env.HOME
const PORT = 47125
process.env.PANDA_MODRINTH_API = `http://127.0.0.1:${PORT}/v2`
const ok = (m: string) => console.log('  ✓', m)
const enc = (s: string) => new TextEncoder().encode(s)
const sha1 = (b: Uint8Array) => createHash('sha1').update(b).digest('hex')

const jar = (kind: string, id: string) =>
  zipSync({
    ...(kind === 'fabric' ? { 'fabric.mod.json': enc(JSON.stringify({ id, depends: { minecraft: '~1.21.1' } })) } : {}),
    ...(kind === 'forge' ? { 'META-INF/mods.toml': enc('modLoader="javafml"') } : {}),
    ...(kind === 'neoforge' ? { 'META-INF/neoforge.mods.toml': enc('modLoader="javafml"') } : {}),
    ...(kind === 'quilt' ? { 'quilt.mod.json': enc('{}') } : {}),
    [`${id}/Main.class`]: enc('x')
  })
const game = (dir: string, mods: Record<string, string>, extra: { saves?: string[]; packs?: string[]; shaders?: string[]; options?: boolean; servers?: boolean; config?: boolean } = {}) => {
  mkdirSync(join(dir, 'mods'), { recursive: true })
  const hashes: Record<string, string> = {}
  for (const [file, kind] of Object.entries(mods)) {
    const data = jar(kind, file.replace(/\W/g, ''))
    writeFileSync(join(dir, 'mods', file), data)
    hashes[file] = sha1(data)
  }
  for (const w of extra.saves ?? []) {
    mkdirSync(join(dir, 'saves', w), { recursive: true })
    writeFileSync(join(dir, 'saves', w, 'level.dat'), 'x')
  }
  for (const p of extra.packs ?? []) mkdirSync(join(dir, 'resourcepacks'), { recursive: true }), writeFileSync(join(dir, 'resourcepacks', p), 'zip')
  for (const p of extra.shaders ?? []) mkdirSync(join(dir, 'shaderpacks'), { recursive: true }), writeFileSync(join(dir, 'shaderpacks', p), 'zip')
  if (extra.options) writeFileSync(join(dir, 'options.txt'), 'key_key.sprint:key.keyboard.left.control\n')
  if (extra.servers) writeFileSync(join(dir, 'servers.dat'), 'nbt')
  if (extra.config) mkdirSync(join(dir, 'config'), { recursive: true }), writeFileSync(join(dir, 'config', 'sodium-options.json'), '{}')
  return hashes
}

const H = process.env.HOME!
const AD = join(ROOT, 'appData')
// Lunar: profiles/lunar/1.21/mods (Fabric + a Forge jar), worlds, packs, options
const lunarHashes = game(join(H, '.lunarclient', 'profiles', 'lunar', '1.21', ), { 'sodium.jar': 'fabric', 'lithium.jar': 'fabric', 'jei-forge.jar': 'forge', 'old.jar.disabled': 'fabric' }, { saves: ['Survival'], packs: ['Faithful.zip'], shaders: ['BSL.zip'], options: true, servers: true, config: true })
// Modrinth App (old style with profile.json) and new style (no metadata)
game(join(AD, 'ModrinthApp', 'profiles', 'Fabulously Optimized'), { 'iris.jar': 'fabric' })
writeFileSync(join(AD, 'ModrinthApp', 'profiles', 'Fabulously Optimized', 'profile.json'), JSON.stringify({ metadata: { name: 'Fabulously Optimized', game_version: '1.21.4', loader: 'fabric' } }))
game(join(AD, 'ModrinthApp', 'profiles', 'All the Mods'), { 'create.jar': 'neoforge', 'ae2.jar': 'neoforge' })
// CurseForge
game(join(H, 'curseforge', 'minecraft', 'Instances', 'Better MC'), { 'bmc.jar': 'forge' }, { saves: ['World 1'] })
writeFileSync(join(H, 'curseforge', 'minecraft', 'Instances', 'Better MC', 'minecraftinstance.json'), JSON.stringify({ name: 'Better MC [FORGE]', gameVersion: '1.20.1', baseModLoader: { name: 'forge-47.2.0' } }))
// Prism
game(join(AD, 'PrismLauncher', 'instances', 'quilty', '.minecraft'), { 'q.jar': 'quilt', 'f.jar': 'fabric' })
writeFileSync(join(AD, 'PrismLauncher', 'instances', 'quilty', 'mmc-pack.json'), JSON.stringify({ components: [{ uid: 'net.minecraft', version: '1.20.4' }, { uid: 'org.quiltmc.quilt-loader', version: '0.26' }] }))
writeFileSync(join(AD, 'PrismLauncher', 'instances', 'quilty', 'instance.cfg'), 'name=Quilty Pack\n')
// Feather + Dawn (unknown layouts: found by searching)
game(join(AD, '.feather', 'user-mods', '1.21.4-fabric'), { 'zoomify.jar': 'fabric' })
game(join(H, '.dawn', 'profiles', 'default', 'game'), { 'appleskin.jar': 'fabric' })
// Official launcher
game(process.platform === 'win32' ? join(AD, '.minecraft') : process.platform === 'darwin' ? join(AD, 'minecraft') : join(H, '.minecraft'), {}, { saves: ['Hardcore'] })
// PandaClient's own folder must never be offered
const settings = await import('../src/main/services/settings.ts')
settings.updateSettings({ gameDir: join(ROOT, 'pandaclient') })
game(join(ROOT, 'pandaclient', 'instances', 'mine'), { 'x.jar': 'fabric' })

// Fake Modrinth: sodium + lithium belong to 1.21.1 / 1.21; Lunar's folder name says "1.21".
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const out: Record<string, unknown> = {}
    for (const h of JSON.parse(body || '{"hashes":[]}').hashes ?? []) {
      if (h === lunarHashes['sodium.jar']) out[h] = { game_versions: ['1.21', '1.21.1'] }
      if (h === lunarHashes['lithium.jar']) out[h] = { game_versions: ['1.21.1'] }
    }
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out))
  })
})
await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', r))

const importer = await import('../src/main/services/importer.ts')
const sources = await importer.scanSources()
const by = (l: string) => sources.filter((s: any) => s.launcher === l)
for (const s of sources) console.log(`     · [${s.launcher}] ${s.name}  mc=${s.mcVersion ?? '?'} loader=${s.loader ?? '?'}  ${JSON.stringify(s.counts)}`)
assert.equal(by('lunar').length, 1)
assert.equal(by('lunar')[0].mcVersion, '1.21')
assert.deepEqual(by('lunar')[0].counts, { mods: 4, resourcepacks: 1, shaderpacks: 1, saves: 1 })
assert.equal(by('modrinth').length, 2)
assert.equal(by('modrinth').find((s: any) => s.name === 'Fabulously Optimized').mcVersion, '1.21.4')
assert.equal(by('curseforge')[0].name, 'Better MC [FORGE]')
assert.equal(by('curseforge')[0].loader, 'forge')
assert.equal(by('prism')[0].name, 'Quilty Pack')
assert.equal(by('prism')[0].loader, 'quilt')
assert.equal(by('feather').length, 1)
assert.equal(by('dawn').length, 1)
assert.equal(by('minecraft')[0].counts.saves, 1)
assert.ok(!sources.some((s: any) => s.path.startsWith(join(ROOT, 'pandaclient'))), "PandaClient's own folder not offered")
ok(`scan found ${sources.length} sources: Lunar, 2× Modrinth, CurseForge, Prism, Feather, Dawn, Minecraft Launcher (own folder excluded)`)

const lunar = by('lunar')[0]
assert.equal(await importer.detectVersion(lunar.path), '1.21.1')
ok('version detected from the mods via Modrinth: 1.21.1 (supported by both Fabric mods)')

const result = await importer.importSource({
  path: lunar.path,
  name: 'From Lunar',
  mcVersion: '1.21.1',
  include: { mods: true, resourcepacks: true, shaderpacks: true, saves: true, config: true, options: true, servers: true, screenshots: true }
})
const instDir = join(ROOT, 'pandaclient', 'instances', result.instanceId)
assert.deepEqual(readdirSync(join(instDir, 'mods')).sort(), ['lithium.jar', 'old.jar.disabled', 'sodium.jar'])
assert.deepEqual(result.skipped, [{ file: 'jei-forge.jar', reason: 'Forge mod' }])
assert.ok(existsSync(join(instDir, 'saves', 'Survival', 'level.dat')))
assert.ok(existsSync(join(instDir, 'resourcepacks', 'Faithful.zip')) && existsSync(join(instDir, 'shaderpacks', 'BSL.zip')))
assert.match(readFileSync(join(instDir, 'options.txt'), 'utf8'), /key_key.sprint/)
assert.ok(existsSync(join(instDir, 'servers.dat')) && existsSync(join(instDir, 'config', 'sodium-options.json')))
assert.ok(existsSync(join(lunar.path, 'mods', 'sodium.jar')), 'source left untouched (copied, not moved)')
ok(`imported: ${result.mods} Fabric mods (disabled one kept disabled), ${result.resourcepacks} pack, ${result.shaderpacks} shader, ${result.saves} world, ${result.other.join(', ')}; skipped ${result.skipped.map((s: any) => `${s.file} (${s.reason})`).join(', ')}`)

const r2 = await importer.importSource({ path: by('modrinth').find((s: any) => s.name === 'All the Mods').path, name: 'ATM', mcVersion: '1.21.1', include: { mods: true, resourcepacks: false, shaderpacks: false, saves: false, config: false, options: false, servers: false, screenshots: false } })
assert.equal(r2.mods, 0)
assert.deepEqual(r2.skipped.map((s: any) => s.reason), ['NeoForge mod', 'NeoForge mod'])
const r3 = await importer.importSource({ path: by('prism')[0].path, name: 'Q', mcVersion: '1.20.4', include: { mods: true, resourcepacks: false, shaderpacks: false, saves: false, config: false, options: false, servers: false, screenshots: false } })
assert.equal(r3.mods, 1)
assert.deepEqual(r3.skipped, [{ file: 'q.jar', reason: 'Quilt mod' }])
ok('NeoForge and Quilt mods skipped with reasons; Fabric mods next to them still imported')

const picked = await importer.describeFolder(join(H, '.dawn'))
assert.ok(picked.path.endsWith(join('default', 'game')))
await assert.rejects(importer.describeFolder(join(ROOT, 'empty-' + Date.now())), /doesn't contain/)
await assert.rejects(importer.importSource({ path: join(ROOT, 'pandaclient', 'instances', 'mine'), name: 'x', mcVersion: '1.21.1', include: {} as any }), /already a PandaClient folder/)
ok('Browse for a folder finds the game folder inside; empty folders and PandaClient folders refused')

server.close()
console.log('IMPORT PASSED')
process.exit(0)
