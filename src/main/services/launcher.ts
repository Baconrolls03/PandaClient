import type { LaunchProgress } from '@shared/types'
import { getInstance, updateInstance } from './instances'

type Emit = (p: LaunchProgress) => void
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * UI preview only. It walks the progress bar through the real stages without downloading anything.
 * The launch step replaces this with Java resolution, loader install and an MCLC launch.
 */
export async function launch(instanceId: string, emit: Emit): Promise<void> {
  const inst = await getInstance(instanceId)
  const base = { instanceId }
  emit({ ...base, stage: 'preparing', progress: null, message: `Preparing ${inst.name}…` })
  await wait(600)
  for (let i = 0; i <= 20; i++) {
    emit({ ...base, stage: 'downloading', progress: i / 20, message: `Downloading Minecraft ${inst.mcVersion} (preview)` })
    await wait(80)
  }
  emit({ ...base, stage: 'launching', progress: null, message: 'Starting game…' })
  await wait(700)
  await updateInstance(instanceId, { lastPlayed: new Date().toISOString() })
  emit({ ...base, stage: 'idle', progress: null, message: 'Preview finished. Real launching comes in a later step.' })
}
