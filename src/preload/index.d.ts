import type { PandaApi } from '../shared/types'

declare global {
  interface Window {
    panda?: PandaApi
  }
}
export {}
