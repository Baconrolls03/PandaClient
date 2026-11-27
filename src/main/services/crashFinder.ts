// Finds the mod that makes Minecraft crash by starting the game with half the mods switched off,
// then half of the half, and so on (a few launches even with 100+ mods). Puts every mod back after.
import { existsSync } from 'node:fs'
import { readFile, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { CrashFinderState, Instance } from '@shared/types'
import { getInstance } from './instances'
import { modIndex, type ModInfo } from './crashDoctor'
import { launchGame, runningInstances, stopGame } from './game/launch'

/** Never switched off during the search: the game or the launcher needs them. */
const PROTECTED = new Set(['minecraft', 'java', 'fabricloader', 'fabric-api', 'fabric', 'pandaclient', 'mixinextras'])
const START_TIMEOUT = 4 * 60_000

/** Mods `set` needs (and what they need), so a test never starts with a missing dependency. */
export function withDependencies(set: ModInfo[], all: ModInfo[]): ModInfo[] {
  const byId = new Map<string, ModInfo>()
  for (const m of all) for (const id of [m.id, ...m.provides]) if (!byId.has(id)) byId.set(id, m)
  const out = new Set(set)
  const queue = [...set]
  while (queue.length) {
    const m = queue.pop()!
    for (const dep of m.depends) {
      const d = byId.get(dep)
      if (d && !out.has(d)) { out.add(d); queue.push(d) }
    }
  }
  return [...out]
}

/** `off` plus every mod that needs one of them (they would fail to load). */
export function offWithDependents(off: ModInfo[], all: ModInfo[]): ModInfo[] {
  const out = new Set(off)
  const ids = () => new Set([...out].flatMap((m) => [m.id, ...m.provides]))
  let grew = true
  while (grew) {
    grew = false
    const gone = ids()
    for (const m of all) if (!out.has(m) && !PROTECTED.has(m.id) && m.depends.some((d) => gone.has(d))) { out.add(m); grew = true }
  }
  return [...out]
}

/** Next group to test: the first half of the suspects plus what they depend on. */
export function nextTest(suspects: ModInfo[], all: ModInfo[]): ModInfo[] {
  const half = Math.ceil(suspects.length / 2)
  // A mod can't be tested without the libraries it needs, so if one half pulls in every suspect, try the other half, then single mods.
  const tries = [suspects.slice(0, half), suspects.slice(half), ...suspects.map((m) => [m])]
  for (const t of tries) {
    const test = withDependencies(t, all)
    if (suspects.some((m) => !test.includes(m))) return test
  }
  return withDependencies(suspects.slice(0, half), all)
}

let state: CrashFinderState = { running: false, step: 0, steps: 0, message: '' }
let cancelled = false
let notify: (s: CrashFinderState) => void = () => {}
export const crashFinderState = () => state
export function onCrashFinder(cb: (s: CrashFinderState) => void) { notify = cb }
function set(p: Partial<CrashFinderState>) { state = { ...state, ...p }; notify(state) }
export function cancelCrashFinder() { cancelled = true; if (state.instanceId) stopGame(state.instanceId) }

/** Start the game once and report whether it reached the main menu. */
async function tryStart(inst: Instance): Promise<'ok' | 'crash'> {
  const r = await startOnce(inst)
  // Wait for the game to close fully before the next test.
  for (let i = 0; i < 60 && runningInstances().includes(inst.id); i++) await new Promise((res) => setTimeout(res, 500))
  return r
}

async function startOnce(inst: Instance): Promise<'ok' | 'crash'> {
  const marker = join(inst.path, 'pandaclient', 'started')
  const log = join(inst.path, 'logs', 'latest.log')
  await rm(marker, { force: true })
  const began = Date.now()
  return new Promise<'ok' | 'crash'>((resolve, reject) => {
    let done = false
    const finish = (r: 'ok' | 'crash') => { if (done) return; done = true; clearInterval(timer); resolve(r) }
    const timer = setInterval(async () => {
      if (cancelled) { stopGame(inst.id); return finish('ok') }
      let up = existsSync(marker)
      // Versions without the PandaClient mod: the sound engine starts once the menu is on the way.
      if (!up && existsSync(log)) {
        const s = await stat(log).catch(() => null)
        if (s && s.mtimeMs > began) up = /Sound engine started/.test(await readFile(log, 'utf8').catch(() => ''))
      }
      if (up || Date.now() - began > START_TIMEOUT) { stopGame(inst.id); finish('ok') }
    }, 1500)
    launchGame(inst.id, (p) => {
      if (p.stage === 'error') finish('crash')
      else if (p.stage === 'idle') finish(existsSync(marker) ? 'ok' : 'crash')
    }, undefined, { quiet: true }).catch((e) => { clearInterval(timer); if (!done) { done = true; reject(e) } })
  })
}

async function setEnabled(inst: Instance, m: ModInfo, on: boolean) {
  const dir = join(inst.path, 'mods')
  const cur = m.file.replace(/\.disabled$/i, '')
  if (on) await rename(join(dir, `${cur}.disabled`), join(dir, cur)).catch(() => {})
  else await rename(join(dir, cur), join(dir, `${cur}.disabled`)).catch(() => {})
}

export async function runCrashFinder(instanceId: string): Promise<CrashFinderState> {
  if (state.running) throw new Error('The crash finder is already running.')
  cancelled = false
  const inst = await getInstance(instanceId)
  const all = (await modIndex(inst)).filter((m) => m.enabled)
  const testable = all.filter((m) => !PROTECTED.has(m.id))
  let suspects = testable
  const steps = Math.max(1, Math.ceil(Math.log2(Math.max(2, suspects.length))) + 1)
  set({ running: true, instanceId, step: 0, steps, message: `Checking ${suspects.length} mods`, culprit: undefined, error: undefined })
  try {
    // First make sure it still crashes with everything on.
    set({ step: 1, message: 'Starting Minecraft with all your mods' })
    if ((await tryStart(inst)) === 'ok') {
      set({ running: false, message: cancelled ? 'Stopped' : 'Minecraft started fine with all your mods, so nothing needs turning off.' })
      return state
    }
    let step = 1
    while (suspects.length > 1 && !cancelled) {
      step++
      const on = new Set(nextTest(suspects, all))
      // Known-good mods stay on; suspects not in this test go off, with anything that needs them.
      const off = offWithDependents(suspects.filter((m) => !on.has(m)), all)
      for (const m of off) await setEnabled(inst, m, false)
      const testing = suspects.filter((m) => on.has(m))
      set({ step, steps: Math.max(steps, step), message: `Testing ${testing.length} of ${suspects.length} mods that might be the cause` })
      const r = await tryStart(inst)
      for (const m of off) await setEnabled(inst, m, true)
      if (cancelled) break
      const next = r === 'crash' ? testing : suspects.filter((m) => !on.has(m))
      // A test that can't split the group any more: stop with what's left.
      if (next.length === 0 || next.length === suspects.length) break
      suspects = next
    }
    if (cancelled) { set({ running: false, message: 'Stopped. All your mods are back as they were.' }); return state }
    const culprit = suspects.length === 1 ? suspects[0] : undefined
    set({
      running: false,
      culprit: culprit ? { id: culprit.id, name: culprit.name, file: culprit.file } : undefined,
      message: culprit
        ? `Found it: ${culprit.name} makes Minecraft crash.`
        : `It's one of: ${suspects.slice(0, 5).map((m) => m.name).join(', ')}${suspects.length > 5 ? '…' : ''}`
    })
    return state
  } catch (e) {
    for (const m of all) await setEnabled(inst, m, true)
    set({ running: false, error: e instanceof Error ? e.message : String(e), message: 'The crash finder stopped' })
    return state
  }
}
