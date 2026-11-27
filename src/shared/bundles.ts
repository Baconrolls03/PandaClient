// Ready-made sets of mods for a new profile, on top of PandaClient and its built-in mods.
export type BundleId = 'pvp' | 'performance' | 'survival' | 'recording' | 'none'

export interface Bundle {
  id: BundleId
  name: string
  description: string
  /** Modrinth slugs. Ones not out for the chosen version are skipped. */
  mods: string[]
}

export const BUNDLES: Bundle[] = [
  { id: 'pvp', name: 'PvP', description: 'Smooth FPS, a cleaner F3 screen and faces next to chat', mods: ['fabric-api', 'dynamic-fps', 'betterf3', 'chat-heads', 'cull-leaves'] },
  { id: 'performance', name: 'Performance', description: 'The most FPS on any PC, best for low-end laptops', mods: ['fabric-api', 'modernfix', 'dynamic-fps', 'badoptimizations', 'cull-leaves'] },
  { id: 'survival', name: 'Survival', description: 'Hunger bars, block info, inventory tweaks and recipe viewer', mods: ['fabric-api', 'appleskin', 'jade', 'mouse-tweaks', 'shulkerboxtooltip', 'emi'] },
  { id: 'recording', name: 'Recording', description: 'Shaders and Replay Mod for videos', mods: ['fabric-api', 'iris', 'replaymod', 'dynamic-fps'] },
  { id: 'none', name: 'Just PandaClient', description: 'Only PandaClient and its built-in mods', mods: ['fabric-api'] }
]
