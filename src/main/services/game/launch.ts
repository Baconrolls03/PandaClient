// Builds the java command line for an instance and runs/tracks the game process.
import { app, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import type { Instance, LaunchHooks, LaunchProgress, QuickPlay, WindowSettings } from '@shared/types'
import { launchAuth, type LaunchAuth } from '../accounts'
import { getInstance, updateInstance } from '../instances'
import { getSettings } from '../settings'
import { type TaskHandle, startTask } from '../tasks'
import { ensureRuntime } from './javaRuntime'
import { assetsDir, install, librariesDir, rulesAllow, type Arg, type Installed } from './mojang'
import { ensurePandaMod } from '../pandaMod'
import { diagnose, fixDuplicates } from '../crashDoctor'
import { recordSession } from '../stats'
import { ensureBundledMods } from '../bundledMods'

type Emit = (p: LaunchProgress) => void

/** Split a user-typed argument string, keeping "quoted parts" together. */
export function splitArgs(s: string): string[] {
  return (s.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((a) => a.replace(/^(["'])(.*)\1$/, '$2'))
}

function expand(args: Arg[], vars: Record<string, string>, features: Record<string, boolean>): string[] {
  const out: string[] = []
  for (const a of args) {
    if (typeof a === 'string') out.push(a)
    else if (rulesAllow(a.rules, features)) out.push(...(Array.isArray(a.value) ? a.value : [a.value]))
  }
  return out.map((a) => a.replace(/\$\{(\w+)\}/g, (m, k: string) => vars[k] ?? m))
}

export interface LaunchCommand {
  java: string
  args: string[]
  cwd: string
}

export function buildCommand(
  inst: Instance,
  installed: Installed,
  java: string,
  auth: LaunchAuth,
  opts: { ramMb: number; jvmArgs: string; window: WindowSettings; quickPlay?: QuickPlay; extraJvm?: string[] }
): LaunchCommand {
  const v = installed.version
  const classpath = [...installed.libraries.classpath, installed.clientJar].join(delimiter)
  const vars: Record<string, string> = {
    auth_player_name: auth.username,
    auth_uuid: auth.uuid.replace(/-/g, ''),
    auth_access_token: auth.accessToken,
    auth_session: auth.accessToken,
    auth_xuid: auth.xuid,
    clientid: '',
    user_type: 'msa',
    user_properties: '{}',
    version_name: v.id,
    version_type: 'PandaClient',
    game_directory: inst.path,
    assets_root: assetsDir(),
    game_assets: assetsDir(),
    assets_index_name: installed.assetsIndex,
    natives_directory: installed.nativesDir,
    library_directory: librariesDir(),
    classpath_separator: delimiter,
    classpath,
    launcher_name: 'PandaClient',
    launcher_version: app.getVersion(),
    resolution_width: String(opts.window.width),
    resolution_height: String(opts.window.height),
    quickPlayPath: join(inst.path, 'quickPlay', 'log.json'),
    quickPlaySingleplayer: opts.quickPlay?.world ?? '',
    quickPlayMultiplayer: opts.quickPlay?.server ?? '',
    quickPlayRealms: ''
  }
  const features: Record<string, boolean> = {
    is_demo_user: false,
    has_custom_resolution: !opts.window.fullscreen,
    has_quick_plays_support: false,
    is_quick_play_singleplayer: Boolean(opts.quickPlay?.world),
    is_quick_play_multiplayer: Boolean(opts.quickPlay?.server),
    is_quick_play_realms: false
  }

  const jvm = [`-Xmx${opts.ramMb}M`, `-Xms${Math.min(1024, opts.ramMb)}M`, ...tunedJvmArgs(opts.jvmArgs)]
  if (v.arguments?.jvm?.length) jvm.push(...expand(v.arguments.jvm, vars, features))
  else jvm.push(`-Djava.library.path=${installed.nativesDir}`, '-cp', classpath)
  const log = v.logging?.client
  if (log && installed.loggingConfig) jvm.push(log.argument.replace('${path}', installed.loggingConfig))
  jvm.push(...(opts.extraJvm ?? []), ...splitArgs(opts.jvmArgs))

  let game: string[]
  if (v.arguments?.game?.length) game = expand(v.arguments.game, vars, features)
  else game = expand(splitArgs(v.minecraftArguments ?? ''), vars, features)
  // Versions without quick-play arguments still understand the older --server flag.
  if (opts.quickPlay?.server && !v.arguments?.game?.some((a) => typeof a !== 'string' && JSON.stringify(a).includes('quickPlay'))) {
    const [host, port] = opts.quickPlay.server.split(':')
    game.push('--server', host, '--port', port ?? '25565')
  }

  return { java, args: [...jvm, v.mainClass, ...game], cwd: inst.path }
}

/**
 * Garbage collector settings tuned for smooth FPS (short pauses instead of big lag spikes), the same
 * kind of flags performance-focused clients ship. Skipped when the player set their own GC flags.
 */
export function tunedJvmArgs(userArgs: string): string[] {
  if (/-XX:\+Use\w+GC|-XX:\+UnlockExperimentalVMOptions/.test(userArgs)) return []
  return [
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+UseG1GC',
    '-XX:MaxGCPauseMillis=37',
    '-XX:G1NewSizePercent=20',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapRegionSize=16M',
    '-XX:+ParallelRefProcEnabled',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysActAsServerClassMachine',
    '-XX:+UseStringDeduplication'
  ]
}

/** Never write the access token to a log. */
export const redact = (args: string[], token: string) => args.map((a) => (token && a.includes(token) ? a.split(token).join('<access token>') : a))

async function applyFullscreen(inst: Instance, fullscreen: boolean): Promise<void> {
  const path = join(inst.path, 'options.txt')
  let text = existsSync(path) ? await readFile(path, 'utf8') : ''
  if (/^fullscreen:/m.test(text)) text = text.replace(/^fullscreen:.*$/m, `fullscreen:${fullscreen}`)
  else text += `${text && !text.endsWith('\n') ? '\n' : ''}fullscreen:${fullscreen}\n`
  await writeFile(path, text)
}

function runHook(cmd: string, cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, { cwd, env, shell: true, windowsHide: true })
    p.on('error', reject)
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Pre-launch command exited with code ${code}`))))
  })
}

/* ───────────── Running games ───────────── */

const running = new Map<string, ChildProcess>()
let liveSink: (id: string, text: string) => void = () => {}
/** Receives the running game's output as it is written (for the live log). */
export function onLiveLog(cb: (id: string, text: string) => void) { liveSink = cb }
const liveLog = (id: string, text: string) => liveSink(id, text)
export const runningInstances = () => [...running.keys()]

export function stopGame(id: string): void {
  running.get(id)?.kill()
}

/** quiet: a test start by the crash finder (no window changes, no playtime, no pre/post commands). */
export async function launchGame(id: string, emit: Emit, quickPlay?: QuickPlay, opts: { quiet?: boolean } = {}): Promise<void> {
  if (running.has(id)) throw new Error('This profile is already running.')
  const inst = await getInstance(id)
  const s = getSettings()
  const base = { instanceId: id }
  const task: TaskHandle = startTask(`Launching ${inst.name}`, id)
  // Mirror task progress into the play bar.
  const progress = (message: string, p: number | null, stage: LaunchProgress['stage'] = 'downloading') => {
    task.update(message, p)
    emit({ ...base, stage, progress: p, message })
  }
  const proxy: TaskHandle = { ...task, update: (m, p) => progress(m, p ?? null) }

  try {
    emit({ ...base, stage: 'preparing', progress: null, message: `Preparing ${inst.name}…` })
    const auth = await launchAuth()
    const installed = await install(inst.mcVersion, inst.loaderVersion, proxy)
    if (!opts.quiet) {
      // Cloud sync: your PandaClient HUD and settings from your other PCs.
      const { pullSettings } = await import('../pandaApi')
      if (await pullSettings().catch(() => false)) progress('Got your PandaClient settings from the cloud', null, 'preparing')
    }
    await ensurePandaMod(inst, true, (m) => progress(m, null, 'preparing'))
    if (!opts.quiet) await ensureBundledMods(inst, (m) => progress(m, null, 'preparing')).catch(() => {})
    // Two copies of the same mod always crash Fabric: keep the newest one.
    const dups = await fixDuplicates(inst).catch(() => [])
    if (dups.length) progress(`Turned off duplicate copies of ${dups.map((d) => d.name).join(', ')}`, null, 'preparing')

    const javaPath = inst.javaPath || s.javaPath
    const java = javaPath || (await ensureRuntime(installed.version.javaVersion?.component ?? 'jre-legacy', proxy))

    const window = inst.window ?? s.window
    const hooks: LaunchHooks = inst.hooks ?? s.hooks
    await applyFullscreen(inst, window.fullscreen)
    await mkdir(join(inst.path, 'logs'), { recursive: true })

    const cmd = buildCommand(inst, installed, java, auth, {
      ramMb: inst.ramMb ?? s.ramMb,
      jvmArgs: [s.jvmArgs, inst.jvmArgs].filter(Boolean).join(' '),
      // One PandaClient mod settings file (HUD layout, mods on/off) shared by every instance.
      extraJvm: [`-Dpandaclient.config=${join(s.gameDir, 'pandaclient-mod.json')}`],
      window,
      quickPlay
    })
    const env = { ...process.env, INST_NAME: inst.name, INST_ID: inst.id, INST_DIR: inst.path, INST_MC_VERSION: inst.mcVersion, INST_JAVA: java }

    if (hooks.preLaunch.trim() && !opts.quiet) {
      progress('Running pre-launch command', null, 'launching')
      await runHook(hooks.preLaunch, inst.path, env)
    }

    progress('Starting Minecraft…', null, 'launching')
    const wrapper = splitArgs(hooks.wrapper)
    const [exe, ...args] = wrapper.length ? [...wrapper, cmd.java, ...cmd.args] : [cmd.java, ...cmd.args]
    const out = createWriteStream(join(inst.path, 'logs', 'pandaclient-output.log'))
    out.write(`[PandaClient] ${redact([exe, ...args], auth.accessToken).join(' ')}\n\n`)

    const child = spawn(exe, args, { cwd: cmd.cwd, env, windowsHide: true, detached: s.onLaunch === 'close' })
    // Listen straight away: 'spawn' fires on the next tick and would be missed after any await.
    const spawned = new Promise<void>((resolve, reject) => {
      child.once('error', reject)
      child.once('spawn', () => resolve())
    })
    running.set(id, child)
    child.stdout?.pipe(out, { end: false })
    child.stderr?.pipe(out, { end: false })
    // Live log for the Logs tab.
    const live = (d: Buffer) => liveLog(id, d.toString('utf8'))
    child.stdout?.on('data', live)
    child.stderr?.on('data', live)
    const started = Date.now()
    await spawned
    await updateInstance(id, { lastPlayed: new Date().toISOString() })
    task.done('Game started')
    emit({ ...base, stage: 'running', progress: null, message: `${inst.name} is running` })

    const win = BrowserWindow.getAllWindows()[0]
    if (s.onLaunch === 'minimize' && !opts.quiet) win?.minimize()
    if (s.onLaunch === 'close' && !opts.quiet) {
      child.unref()
      app.quit()
      return
    }

    child.once('exit', async (code, signal) => {
      running.delete(id)
      out.end()
      const played = Math.round((Date.now() - started) / 1000)
      if (!opts.quiet) {
        const latest = await getInstance(id).catch(() => null)
        if (latest) await updateInstance(id, { playtimeSec: latest.playtimeSec + played }).catch(() => {})
        await recordSession(id, inst.name, started, played).catch(() => {})
        void import('../pandaApi').then((p) => p.pushSettings()).catch(() => {})
        if (hooks.postExit.trim()) runHook(hooks.postExit, inst.path, env).catch(() => {})
      }
      if (s.refocusOnExit && !opts.quiet && win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
      const crashed = code !== 0 && signal !== 'SIGTERM' && code !== null
      const crash = crashed ? await diagnose(inst, started).catch(() => undefined) : undefined
      emit({
        ...base,
        stage: crashed ? 'error' : 'idle',
        progress: null,
        message: crashed ? (crash?.summary ?? `Minecraft closed with error code ${code}. Check the Logs tab.`) : '',
        crash
      })
    })
  } catch (e) {
    running.delete(id)
    task.fail(e)
    throw e
  }
}
