// Background art for the lobby and profile cards (original artwork made for PandaClient).
import bamboo from '@/assets/lobby/bamboo.jpg'
import jungle from '@/assets/lobby/jungle.jpg'
import aurora from '@/assets/lobby/aurora.jpg'
import canyon from '@/assets/lobby/canyon.jpg'
import crystal from '@/assets/lobby/crystal.jpg'
import blossom from '@/assets/lobby/blossom.jpg'

export const LOBBY_ART = [bamboo, jungle, aurora, canyon, crystal, blossom]

/** A stable picture for a profile (the same one every time). */
export function artFor(id: string | null | undefined): string {
  if (!id) return LOBBY_ART[0]
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return LOBBY_ART[Math.abs(h) % LOBBY_ART.length]
}
