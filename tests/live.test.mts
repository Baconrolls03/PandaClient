// Live smoke test against the real Mojang, Fabric, Quilt, Forge, NeoForge and Modrinth APIs.
// Downloads real files into a temp folder. Needs network access.
//   npm run test:live
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { unzipSync } from 'fflate'

process.env.TEST_ROOT ??= mkdtempSync(join(tmpdir(), 'pandaclient-live-'))
delete process.env.PANDA_MODRINTH_API

const SRC = '../src/main/services'
const settings = await import(`${SRC}/settings.ts`)
settings.updateSettings({ gameDir: join(process.env.TEST_ROOT, 'game') })
const versions = await import(`${SRC}/versions.ts`)
const loaders = await import(`${SRC}/loaders.ts`)
const mr = await import(`${SRC}/modrinth.ts`)
const instances = await import(`${SRC}/instances.ts`)
const content = await import(`${SRC}/content.ts`)
const mrpack = await import(`${SRC}/mrpack.ts`)

const ok = (msg: string) => console.log('  ✓', msg)
const t0 = Date.now()

// Versions
const list = await versions.listVersions()
assert.ok(!list.offline && list.versions.length > 500)
const releases = list.versions.filter((v: any) => v.type === 'release')
const fabricLatest = releases.find((v: any) => v.fabric)!.id
ok(`Mojang: ${list.versions.length} versions, latest release ${list.latestRelease}, newest with Fabric ${fabricLatest}`)

// Loaders
for (const [loader, mc] of [['fabric', fabricLatest], ['quilt', '1.21.1'], ['forge', '1.20.1'], ['neoforge', '1.21.1'], ['neoforge', list.latestRelease]] as const) {
  const lv = await loaders.loaderVersions(loader, mc)
  if (loader === 'neoforge' && mc === list.latestRelease && lv.length === 0) {
    ok(`neoforge ${mc}: none yet`)
    continue
  }
  assert.ok(lv.length > 0, `${loader} ${mc} has versions`)
  if (loader === 'quilt') assert.equal(lv[0].version, [...lv].map((l: any) => l.version).sort((a: string, b: string) => b.localeCompare(a, undefined, { numeric: true }))[0])
  ok(`${loader} ${mc}: ${lv.length} versions, newest ${lv[0].version}${lv[0].stable ? '' : ' (beta)'}, first stable ${lv.find((l: any) => l.stable)?.version}`)
}

// Search every project type
for (const type of ['mod', 'modpack', 'resourcepack', 'shader', 'datapack'] as const) {
  const r = await mr.search({ query: '', type, sort: 'downloads', categories: [], loaders: type === 'mod' ? ['fabric'] : [], gameVersions: [], environment: type === 'mod' ? 'client' : null, offset: 0, limit: 5 })
  assert.ok(r.hits.length > 0, type)
  ok(`search ${type}: ${r.total_hits} results, top: ${r.hits.slice(0, 3).map((h: any) => h.title).join(', ')}`)
}
const filtered = await mr.search({ query: 'minimap', type: 'mod', sort: 'relevance', categories: ['utility'], loaders: ['fabric'], gameVersions: ['1.21.1'], environment: 'client', offset: 0, limit: 3 })
ok(`filtered search (minimap, utility, fabric, 1.21.1): ${filtered.total_hits} hits, e.g. ${filtered.hits[0]?.title}`)
const cats = await mr.categories()
const gvs = await mr.gameVersions()
const members = await mr.members('sodium')
ok(`tags: ${cats.length} categories, ${gvs.length} game versions; sodium team: ${members.map((m: any) => m.user.username).join(', ')}`)

// Instance + performance pack on the newest Fabric version
const fabricLoader = (await loaders.loaderVersions('fabric', fabricLatest)).find((l: any) => l.stable)!.version
const inst = await instances.createInstance({ name: 'Live Fabric', mcVersion: fabricLatest, loader: 'fabric', loaderVersion: fabricLoader })
const skipped = await content.installMany(inst.id, content.PERFORMANCE_PACK, 'perf')
let items = await content.listContent(inst.id)
ok(`perf pack on ${fabricLatest}: ${items.map((i: any) => `${i.project?.title} ${i.version?.number}`).join(' | ')}${skipped.length ? ` (not available yet: ${skipped.join(', ')})` : ''}`)
assert.ok(items.length >= 2 && items.every((i: any) => i.project))

// Mod with dependencies, resource pack, shader, data pack
await content.installProject(inst.id, 'modmenu')
await content.installProject(inst.id, 'faithful-32x')
await content.installProject(inst.id, 'complementary-reimagined')
try {
  await content.installProject(inst.id, 'terralith')
} catch (e) {
  ok(`terralith: ${(e as Error).message}`)
}
items = await content.listContent(inst.id)
const byType = (t: string) => items.filter((i: any) => i.type === t).map((i: any) => i.project?.title ?? i.file)
ok(`mods: ${byType('mod').join(', ')}`)
ok(`resource packs: ${byType('resourcepack').join(', ')} · shaders: ${byType('shader').join(', ')} · data packs: ${byType('datapack').join(', ') || '(none)'}`)

// Update flow: older Sodium on 1.21.1
const old = await instances.createInstance({ name: 'Live Old', mcVersion: '1.21.1', loader: 'fabric', loaderVersion: null })
const sodiumVersions = (await mr.versions('sodium', { loaders: ['fabric'], gameVersions: ['1.21.1'] })).sort((a: any, b: any) => b.date_published.localeCompare(a.date_published))
const older = sodiumVersions[sodiumVersions.length - 1]
await content.installProject(old.id, 'sodium', older.id)
const checked = await content.checkUpdates(old.id)
const s = checked.find((i: any) => i.project?.slug === 'sodium')
assert.ok(s?.update, 'sodium update found')
const target = await mr.version(s.update.versionId)
assert.equal(target.version_type, 'release', 'update should be a stable release')
ok(`update check: Sodium ${s.version.number} → ${s.update.number} (${target.version_type})`)
await content.updateContent(old.id, [{ file: s.file, type: 'mod' }])
const after = (await content.listContent(old.id)).filter((i: any) => i.project?.slug === 'sodium')
assert.equal(after.length, 1)
assert.equal(after[0].version.number, s.update.number)
ok(`updated: ${after[0].file} (old file removed)`)

// Vanilla instance refuses a Fabric-only mod
const van = await instances.createInstance({ name: 'Live Vanilla', mcVersion: '1.21.1', loader: 'vanilla', loaderVersion: null })
await assert.rejects(content.installProject(van.id, 'sodium'))
await content.installProject(van.id, 'faithful-32x')
await content.installProject(van.id, 'terralith')
const vanItems = await content.listContent(van.id)
assert.ok(vanItems.some((i: any) => i.type === 'datapack' && i.project?.slug === 'terralith'))
ok(`vanilla: Sodium refused; installed ${vanItems.map((i: any) => `${i.project?.title} (${i.type})`).join(', ')}`)

// Real modpack
const pack = await mrpack.installModpack('fabulously-optimized')
const mods = readdirSync(join(pack.path, 'mods'))
assert.ok(mods.length > 5)
assert.ok(existsSync(join(pack.path, 'config')) || existsSync(join(pack.path, 'options.txt')))
ok(`modpack Fabulously Optimized: ${pack.loader} ${pack.loaderVersion}, MC ${pack.mcVersion}, ${mods.length} mods, icon ${pack.iconUrl ? 'yes' : 'no'}`)
const packItems = await content.listContent(pack.id)
ok(`  identified ${packItems.filter((i: any) => i.project).length}/${packItems.length} files on Modrinth`)

// Export + re-import
const outFile = await mrpack.exportMrpack(inst.id)
const index = JSON.parse(new TextDecoder().decode(unzipSync(new Uint8Array(readFileSync(outFile!)))['modrinth.index.json']))
ok(`export: ${index.files.length} Modrinth files, deps ${JSON.stringify(index.dependencies)}`)
const reimported = await mrpack.importMrpack(outFile!)
ok(`re-import: ${readdirSync(join(reimported.path, 'mods')).length} mods`)

console.log(`LIVE PASSED in ${Math.round((Date.now() - t0) / 1000)}s`)
process.exit(0)
