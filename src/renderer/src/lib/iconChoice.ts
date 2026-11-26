import type { Instance } from '@shared/types'
import { api } from './api'
import type { IconChoice } from '@/modals/IconEditor'

export const choiceOf = (inst: Pick<Instance, 'iconUrl' | 'iconPreset'>): IconChoice =>
  inst.iconUrl ? { kind: 'file', file: '' } : inst.iconPreset ? { kind: 'preset', preset: inst.iconPreset } : { kind: 'default' }

/** Save an icon-editor choice onto an instance. */
export async function applyIconChoice(id: string, c: IconChoice): Promise<void> {
  if (c.kind === 'file') {
    if (c.file) await api.instances.setIcon(id, c.file)
    await api.instances.update(id, { iconPreset: null })
  } else {
    await api.instances.setIcon(id, null)
    await api.instances.update(id, { iconPreset: c.kind === 'preset' ? c.preset : null })
  }
}
