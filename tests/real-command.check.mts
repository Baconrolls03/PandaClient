// Sanity check against REAL Mojang + Fabric metadata (no game files downloaded):
// merge 26.3 with its Fabric profile and build the launch command for each OS.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
process.env.TEST_ROOT ??= mkdtempSync(join(tmpdir(), 'pandaclient-real-'))
const settings = await import('../src/main/services/settings.ts')
settings.updateSettings({ gameDir: join(process.env.TEST_ROOT, 'game') })
const mojang = await import('../src/main/services/game/mojang.ts')
const launch = await import('../src/main/services/game/launch.ts')
const loaders = await import('../src/main/services/loaders.ts')

for (const mc of ['26.3', '1.21.11', '1.20.1', '1.16.5', '1.14.4']) {
  const fabric = await loaders.latestStableFabric(mc)
  const merged = mojang.merge(await mojang.fabricJson(mc, fabric!), await mojang.vanillaJson(mc))
  const { jobs, resolved } = mojang.libraryJobs(merged)
  // group/artifact/version/artifact-version[-classifier].jar → artifact[-classifier] must be unique (no two versions of one library)
  const keys = resolved.classpath.map((p) => {
    const seg = p.split(/[\\/]/)
    const [artifact, version, file] = seg.slice(-3)
    return `${seg.slice(-4, -3)}:${artifact}${file.slice(`${artifact}-${version}`.length).replace(/\.jar$/, '')}`
  })
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i)
  assert.deepEqual(dupes, [], 'no library twice on the classpath')
  assert.ok(jobs.every((j) => /^https:\/\//.test(j.url)), 'every library has an https URL')
  if (['1.16.5', '1.14.4'].includes(mc)) assert.ok(resolved.nativeJars.length >= 7, 'old-style LWJGL natives found')
  assert.ok(resolved.classpath.some((p) => /[\\/]lwjgl-3[.\d]+\.jar$/.test(p)), 'LWJGL on the classpath')
  const cmd = launch.buildCommand(
    { id: 'x', path: '/inst', name: 'x', mcVersion: mc } as any,
    { version: merged, clientJar: '/client.jar', libraries: resolved, nativesDir: '/natives', assetsIndex: merged.assetIndex!.id, loggingConfig: '/log.xml' },
    'java',
    { uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', username: 'Steve', accessToken: 'TOKEN', xuid: '1' },
    { ramMb: 4096, jvmArgs: '', window: { fullscreen: false, width: 854, height: 480 } }
  )
  const leftover = cmd.args.filter((a) => /\$\{/.test(a))
  assert.deepEqual(leftover, [], `unfilled placeholders: ${leftover}`)
  assert.equal(cmd.args[cmd.args.indexOf(merged.mainClass) - 0], 'net.fabricmc.loader.impl.launch.knot.KnotClient')
  console.log(`  ✓ ${mc} + Fabric ${fabric}: Java ${merged.javaVersion?.majorVersion} (${merged.javaVersion?.component}), ${resolved.classpath.length} libs, ${resolved.nativeJars.length} native jars to unpack, main ${merged.mainClass}, ${cmd.args.length} args, no placeholders left`)
}
console.log('REAL METADATA OK')
process.exit(0)
