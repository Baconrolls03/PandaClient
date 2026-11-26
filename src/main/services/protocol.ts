import { net, protocol } from 'electron'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gameDir, isInside } from './paths'

/** Must run before app `ready`. */
export function registerSchemes(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: 'panda', privileges: { standard: true, secure: true, supportFetchAPI: true } }])
}

/** Serve local images (icons, screenshots) to the renderer, only from inside the game directory. */
export function handleProtocol(): void {
  protocol.handle('panda', (req) => {
    const url = new URL(req.url)
    const abs = resolve(decodeURIComponent(url.pathname.replace(/^\//, '')))
    if (url.host !== 'local' || !isInside(gameDir(), abs)) return new Response('Forbidden', { status: 403 })
    return net.fetch(pathToFileURL(abs).toString())
  })
}
