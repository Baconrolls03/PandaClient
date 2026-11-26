import type { LaunchProgress } from '@shared/types'

type Emit = (p: LaunchProgress) => void
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * UI preview only. It walks the progress bar through the real stages without downloading anything.
 * Step 4/5 replaces this with Fabric + Modrinth installs and an MCLC launch.
 */
export async function launch(version: string, emit: Emit): Promise<void> {
  emit({ stage: 'preparing', progress: null, message: `Preparing Minecraft ${version}…` })
  await wait(700)
  for (let i = 0; i <= 20; i++) {
    emit({ stage: 'downloading', progress: i / 20, message: 'Downloading game files from Mojang (preview)' })
    await wait(90)
  }
  for (let i = 0; i <= 10; i++) {
    emit({ stage: 'installing-mods', progress: i / 10, message: 'Installing Fabric, Sodium, Lithium, Iris (preview)' })
    await wait(90)
  }
  emit({ stage: 'launching', progress: null, message: 'Starting game…' })
  await wait(800)
  emit({ stage: 'idle', progress: null, message: 'Preview finished. Real launching comes in a later step.' })
}
