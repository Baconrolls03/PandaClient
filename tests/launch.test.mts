// Launches a stand-in "Minecraft" (a tiny Java program) through the real launcher code, against a fake
// Mojang / Fabric / Java-runtime server. Checks downloads, natives, the Java runtime install, the exact
// command line, hooks, quick play, play time and that the access token never reaches the log.
//   npm run test:launch   (needs a JDK: java + javac + jar)
import http from 'node:http'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { zipSync } from 'fflate'

const PORT = 47124
const BASE = `http://127.0.0.1:${PORT}`
process.env.TEST_ROOT ??= mkdtempSync(join(tmpdir(), 'pandaclient-launch-'))
process.env.PANDA_MOJANG_MANIFEST = `${BASE}/manifest.json`
process.env.PANDA_JAVA_MANIFEST = `${BASE}/java/all.json`
process.env.PANDA_FABRIC_META = `${BASE}/fabric`
process.env.PANDA_ASSETS_BASE = `${BASE}/assets`
const ROOT = process.env.TEST_ROOT
const ok = (m: string) => console.log('  ✓', m)
const sha1 = (b: Uint8Array) => createHash('sha1').update(b).digest('hex')
const enc = (s: string) => new TextEncoder().encode(s)

/* ── Build the fake game: FakeGame (main class, in the "fabric loader" jar) + lib.Hello (a vanilla library) ── */
const build = join(ROOT, 'javabuild')
mkdirSync(join(build, 'src', 'lib'), { recursive: true })
writeFileSync(
  join(build, 'src', 'FakeGame.java'),
  `public class FakeGame { public static void main(String[] a) throws Exception {
    Class.forName("lib.Hello");
    String out = "ARGS=" + String.join("|", a) + "\\nCP=" + System.getProperty("java.class.path")
      + "\\nLIBPATH=" + System.getProperty("java.library.path") + "\\nXMX=" + Runtime.getRuntime().maxMemory()
      + "\\nLOG4J=" + System.getProperty("log4j.configurationFile") + "\\nFABRIC=" + System.getProperty("FabricMcEmu")
      + "\\nWRAPPED=" + System.getenv("PANDA_WRAPPED") + "\\nINST=" + System.getenv("INST_ID") + "\\n";
    java.nio.file.Files.writeString(java.nio.file.Path.of("launched.txt"), out);
    System.out.println("fake game says hi");
    Thread.sleep(1200);
  }}`
)
writeFileSync(join(build, 'src', 'lib', 'Hello.java'), 'package lib; public class Hello {}')
execFileSync('javac', ['-d', join(build, 'classes'), join(build, 'src', 'FakeGame.java'), join(build, 'src', 'lib', 'Hello.java')], { stdio: 'ignore' })
execFileSync('jar', ['cf', join(build, 'loader.jar'), '-C', join(build, 'classes'), 'FakeGame.class'], { stdio: 'ignore' })
execFileSync('jar', ['cf', join(build, 'lib.jar'), '-C', join(build, 'classes'), 'lib/Hello.class'], { stdio: 'ignore' })

/* ── Fake server content ── */
const files = new Map<string, Uint8Array>()
const put = (path: string, data: Uint8Array) => {
  files.set(path, data)
  return { url: `${BASE}${path}`, sha1: sha1(data), size: data.length }
}
const client = put('/v/client.jar', zipSync({ 'version.json': enc('{}') }))
const libJar = put('/lib/com/example/hello/1.0/hello-1.0.jar', new Uint8Array(readFileSync(join(build, 'lib.jar'))))
const natOld = put('/lib/org/example/old/1.0/old-1.0-natives-linux.jar', zipSync({ 'libold.so': enc('so'), 'META-INF/MANIFEST.MF': enc('m') }))
const natNew = put('/lib/org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux.jar', zipSync({ 'linux/x64/org/lwjgl/liblwjgl.so': enc('so') }))
const natArm = put('/lib/org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux-arm64.jar', zipSync({ 'x': enc('x') }))
const natMac = put('/lib/org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-macos.jar', zipSync({ 'x': enc('x') }))
put('/maven/net/fabricmc/fabric-loader/0.20.1/fabric-loader-0.20.1.jar', new Uint8Array(readFileSync(join(build, 'loader.jar'))))
const asset1 = enc('sound bytes')
const asset2 = enc('lang bytes')
const assetIndex = put('/indexes/26.json', enc(JSON.stringify({ objects: { 'a.ogg': { hash: sha1(asset1), size: asset1.length }, 'b.json': { hash: sha1(asset2), size: asset2.length }, 'c.json': { hash: sha1(asset2), size: asset2.length } } })))
for (const a of [asset1, asset2]) files.set(`/assets/${sha1(a).slice(0, 2)}/${sha1(a)}`, a)
const logCfg = put('/log/client-1.21.2.xml', enc('<Configuration/>'))

const lib = (name: string, art: { url: string; sha1: string; size: number }, path: string, rules?: unknown) => ({ name, downloads: { artifact: { path, ...art } }, ...(rules ? { rules } : {}) })
const versionJson = {
  id: '26.3',
  type: 'release',
  mainClass: 'net.minecraft.client.main.Main',
  javaVersion: { component: 'java-runtime-test', majorVersion: 21 },
  downloads: { client },
  assetIndex: { id: '26', ...assetIndex },
  logging: { client: { argument: '-Dlog4j.configurationFile=${path}', file: { id: 'client-1.21.2.xml', ...logCfg } } },
  libraries: [
    lib('com.example:hello:1.0', libJar, 'com/example/hello/1.0/hello-1.0.jar'),
    lib('org.lwjgl:lwjgl:3.3.3:natives-linux', natNew, 'org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux.jar', [{ action: 'allow', os: { name: 'linux' } }]),
    lib('org.lwjgl:lwjgl:3.3.3:natives-linux-arm64', natArm, 'org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux-arm64.jar', [{ action: 'allow', os: { name: 'linux' } }]),
    lib('org.lwjgl:lwjgl:3.3.3:natives-macos', natMac, 'org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-macos.jar', [{ action: 'allow', os: { name: 'osx' } }]),
    { name: 'org.example:old:1.0', natives: { linux: 'natives-linux', windows: 'natives-windows' }, extract: { exclude: ['META-INF/'] }, downloads: { classifiers: { 'natives-linux': { path: 'org/example/old/1.0/old-1.0-natives-linux.jar', ...natOld } } } }
  ],
  arguments: {
    jvm: ['-Djava.library.path=${natives_directory}', '-cp', '${classpath}', { rules: [{ action: 'allow', os: { name: 'osx' } }], value: ['-XstartOnFirstThread'] }],
    game: [
      '--username', '${auth_player_name}', '--version', '${version_name}', '--gameDir', '${game_directory}', '--assetsDir', '${assets_root}',
      '--assetIndex', '${assets_index_name}', '--uuid', '${auth_uuid}', '--accessToken', '${auth_access_token}', '--userType', '${user_type}',
      '--versionType', '${version_type}',
      { rules: [{ action: 'allow', features: { has_custom_resolution: true } }], value: ['--width', '${resolution_width}', '--height', '${resolution_height}'] },
      { rules: [{ action: 'allow', features: { is_quick_play_multiplayer: true } }], value: ['--quickPlayMultiplayer', '${quickPlayMultiplayer}'] },
      { rules: [{ action: 'allow', features: { is_quick_play_singleplayer: true } }], value: ['--quickPlaySingleplayer', '${quickPlaySingleplayer}'] }
    ]
  }
}
const vj = put('/v/26.3.json', enc(JSON.stringify(versionJson)))
files.set('/manifest.json', enc(JSON.stringify({ latest: { release: '26.3' }, versions: [{ id: '26.3', type: 'release', ...vj }] })))
files.set('/fabric/versions/loader/26.3/0.20.1/profile/json', enc(JSON.stringify({
  id: 'fabric-loader-0.20.1-26.3', inheritsFrom: '26.3', mainClass: 'FakeGame',
  libraries: [{ name: 'net.fabricmc:fabric-loader:0.20.1', url: `${BASE}/maven/` }],
  arguments: { game: [], jvm: ['-DFabricMcEmu=net.minecraft.client.main.Main'] }
})))
// Java runtime: bin/java is a script that hands over to the system JDK.
const javaScript = put('/java/files/java', enc('#!/bin/sh\nexec java "$@"\n'))
const javaManifest = put('/java/manifest.json', enc(JSON.stringify({ files: { bin: { type: 'directory' }, 'bin/java': { type: 'file', executable: true, downloads: { raw: javaScript } }, 'lib/java': { type: 'link', target: '../bin/java' } } })))
files.set('/java/all.json', enc(JSON.stringify({ linux: { 'java-runtime-test': [{ manifest: javaManifest, version: { name: '21.0.test' } }] } })))

let requests = 0
const server = http.createServer((req, res) => {
  requests++
  const data = files.get(new URL(req.url!, BASE).pathname)
  if (!data) return res.writeHead(404).end()
  res.writeHead(200, { 'content-length': data.length }).end(data)
})
await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', r))

/* ── Run the real launcher ── */
const SRC = '../src/main/services'
const settings = await import(`${SRC}/settings.ts`)
settings.updateSettings({ gameDir: join(ROOT, 'game'), ramMb: 2048, javaPath: '' })
const instances = await import(`${SRC}/instances.ts`)
const launch = await import(`${SRC}/game/launch.ts`)

const inst = await instances.createInstance({ name: 'Launch Test', mcVersion: '26.3', loaderVersion: '0.20.1' })
const events: any[] = []
const finished = () =>
  new Promise<any>((resolve) => {
    const timer = setInterval(() => {
      const last = events[events.length - 1]
      if (last && (last.stage === 'error' || (last.stage === 'idle' && events.some((e) => e.stage === 'running')))) {
        clearInterval(timer)
        resolve(last)
      }
    }, 100)
  })

// 1. No account → clear error
await assert.rejects(launch.launchGame(inst.id, (e: any) => events.push(e)), /Sign in with a Microsoft account/)
ok('launching without an account asks you to sign in')

// Fake signed-in account with a cached, unexpired Minecraft token.
const payload = Buffer.from(JSON.stringify({ xuid: '2535400000000000' })).toString('base64url')
const TOKEN = `eyJhbGciOiJIUzI1NiJ9.${payload}.c2lnbmF0dXJl`
mkdirSync(join(ROOT, 'userData'), { recursive: true })
writeFileSync(join(ROOT, 'userData', 'accounts.json'), JSON.stringify({
  active: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
  accounts: [{ uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', username: 'Steve', refresh: 'b64:', mc: { token: `b64:${Buffer.from(TOKEN).toString('base64')}`, exp: Date.now() + 3600_000 } }]
}))

// 2. Full launch with hooks + wrapper
settings.updateSettings({ hooks: { preLaunch: 'echo pre > pre.txt', wrapper: 'env PANDA_WRAPPED=yes', postExit: 'echo post > post.txt' } })
await launch.launchGame(inst.id, (e: any) => events.push(e)).catch((e: Error) => events.push({ stage: 'error', message: `threw: ${e.stack}` }))
const end = await finished()
assert.equal(end.stage, 'idle', JSON.stringify(end))
const out = Object.fromEntries(readFileSync(join(inst.path, 'launched.txt'), 'utf8').trim().split('\n').map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const args = out.ARGS.split('|')
const arg = (flag: string) => args[args.indexOf(flag) + 1]
assert.equal(arg('--username'), 'Steve')
assert.equal(arg('--uuid'), '069a79f444e94726a5befca90e38aaf5')
assert.equal(arg('--accessToken'), TOKEN)
assert.equal(arg('--version'), 'fabric-loader-0.20.1-26.3')
assert.equal(arg('--gameDir'), inst.path)
assert.equal(arg('--assetIndex'), '26')
assert.equal(arg('--userType'), 'msa')
assert.equal(arg('--width'), '854')
assert.ok(!args.includes('--quickPlayMultiplayer'))
ok(`game arguments: ${args.filter((a: string) => a !== TOKEN).join(' ')}`)

const cp = out.CP.split(':')
assert.ok(cp.some((p: string) => p.endsWith('fabric-loader-0.20.1.jar')), 'fabric loader on classpath')
assert.ok(cp.some((p: string) => p.endsWith('hello-1.0.jar')), 'vanilla library on classpath')
assert.ok(cp.some((p: string) => p.endsWith('lwjgl-3.3.3-natives-linux.jar')), 'linux natives on classpath')
assert.ok(!cp.some((p: string) => p.includes('arm64') || p.includes('macos')), 'wrong-platform natives skipped')
assert.ok(cp[cp.length - 1].endsWith(join('versions', '26.3', '26.3.jar')), 'client jar last')
ok('classpath: Fabric + libraries + linux natives + client jar; arm64/macOS natives skipped')
assert.ok(existsSync(join(out.LIBPATH, 'libold.so')) && !existsSync(join(out.LIBPATH, 'MANIFEST.MF')))
ok('old-style natives extracted (META-INF excluded)')
assert.ok(Number(out.XMX) > 1.5e9 && Number(out.XMX) <= 2.2e9, out.XMX)
assert.ok(out.LOG4J.endsWith('client-1.21.2.xml') && existsSync(out.LOG4J))
assert.equal(out.FABRIC, 'net.minecraft.client.main.Main')
ok(`JVM: -Xmx2048M (max heap ${(Number(out.XMX) / 1e9).toFixed(2)} GB), log4j config, Fabric JVM arg`)
assert.ok(readdirSync(join(ROOT, 'game', 'assets', 'objects')).length === 2)
ok('assets downloaded and de-duplicated (3 entries → 2 files)')
assert.ok(existsSync(join(ROOT, 'game', 'runtime', 'java-runtime-test', 'bin', 'java')))
ok('Java runtime installed from the Mojang-style manifest and used to launch')
assert.equal(out.WRAPPED, 'yes')
assert.equal(out.INST, inst.id)
assert.ok(existsSync(join(inst.path, 'pre.txt')))
await new Promise((r) => setTimeout(r, 500))
assert.ok(existsSync(join(inst.path, 'post.txt')))
ok('pre-launch, wrapper and post-exit hooks ran (INST_* variables set)')
const log = readFileSync(join(inst.path, 'logs', 'pandaclient-output.log'), 'utf8')
assert.ok(log.includes('fake game says hi') && log.includes('<access token>') && !log.includes(TOKEN))
ok('game output captured to logs/pandaclient-output.log, access token redacted')
const after = await instances.getInstance(inst.id)
assert.ok(after.playtimeSec >= 1 && after.lastPlayed)
assert.match(readFileSync(join(inst.path, 'options.txt'), 'utf8'), /fullscreen:false/)
ok(`play time recorded (${after.playtimeSec}s), last played set, options.txt fullscreen:false`)
assert.ok(events.some((e) => e.stage === 'downloading') && events.some((e) => e.stage === 'running'))
ok(`progress events: ${[...new Set(events.map((e) => e.stage))].join(' → ')}`)

// 3. Second launch: nothing re-downloaded, quick play into a server, fullscreen
const before = requests
events.length = 0
settings.updateSettings({ hooks: { preLaunch: '', wrapper: '', postExit: '' }, window: { fullscreen: true, width: 1280, height: 720 } })
await launch.launchGame(inst.id, (e: any) => events.push(e), { server: 'play.example.com' })
await finished()
const args2 = readFileSync(join(inst.path, 'launched.txt'), 'utf8').split('\n')[0].slice(5).split('|')
assert.equal(args2[args2.indexOf('--quickPlayMultiplayer') + 1], 'play.example.com')
assert.ok(!args2.includes('--width'), 'fullscreen: no custom resolution')
assert.match(readFileSync(join(inst.path, 'options.txt'), 'utf8'), /fullscreen:true/)
const refetched = requests - before
assert.ok(refetched <= 3, `only metadata refetched, got ${refetched}`)
ok(`second launch: quick play server joined, fullscreen on, ${refetched} metadata requests and no file re-downloads`)

// 4. Stop a running game
events.length = 0
settings.updateSettings({ window: { fullscreen: false, width: 854, height: 480 } })
writeFileSync(join(ROOT, 'game', 'versions', 'fabric-loader-0.20.1-26.3', 'fabric-loader-0.20.1-26.3.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(ROOT, 'game', 'versions', 'fabric-loader-0.20.1-26.3', 'fabric-loader-0.20.1-26.3.json'), 'utf8')) }))
await launch.launchGame(inst.id, (e: any) => events.push(e))
assert.deepEqual(launch.runningInstances(), [inst.id])
await assert.rejects(launch.launchGame(inst.id, () => {}), /already running/)
launch.stopGame(inst.id)
const stopped = await finished()
assert.equal(stopped.stage, 'idle')
assert.deepEqual(launch.runningInstances(), [])
ok('Stop kills the game; launching twice is refused')

server.close()
console.log('LAUNCH PASSED')
process.exit(0)
