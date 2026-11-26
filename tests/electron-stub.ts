import { mkdirSync } from 'node:fs'
// Stand-in for the bits of Electron the services use.
const root = process.env.TEST_ROOT!
mkdirSync(root, { recursive: true })
export const app = { getPath: (n: string) => (n === 'appData' ? root + '/appData' : root + '/userData'), getVersion: () => '0.1.0', getAppPath: () => root, isPackaged: false, quit: () => {} }
export const net = { fetch: (u: string, i?: RequestInit) => fetch(u, i) }
export const shell = {
  trashItem: async () => {
    throw new Error('no trash in test')
  },
  showItemInFolder: () => {},
  openPath: async () => ''
}
export const dialog = { showSaveDialog: async () => ({ canceled: false, filePath: root + '/export.mrpack' }) }
export const protocol = {}
export const safeStorage = { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() }
export const BrowserWindow = { getAllWindows: () => [] }
