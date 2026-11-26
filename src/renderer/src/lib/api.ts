import type { PandaApi } from '@shared/types'
import { createMock } from './mock'

/**
 * In Electron this is the preload bridge. In a plain browser (`npm run dev:web`) we fall back
 * to an in-memory mock so the UI can be designed without the main process.
 */
export const api: PandaApi = window.panda ?? createMock()
export const isElectron = Boolean(window.panda)
