// PandaClient's own profile icon artwork (made for PandaClient, no emoji).
import panda from '@/assets/icons/panda.jpg'
import swords from '@/assets/icons/swords.jpg'
import pickaxe from '@/assets/icons/pickaxe.jpg'
import campfire from '@/assets/icons/campfire.jpg'
import shield from '@/assets/icons/shield.jpg'
import potion from '@/assets/icons/potion.jpg'
import chest from '@/assets/icons/chest.jpg'
import blossom from '@/assets/icons/blossom.jpg'

export const ART_ICONS: { id: string; name: string; src: string }[] = [
  { id: 'art:panda', name: 'Panda', src: panda },
  { id: 'art:swords', name: 'PvP', src: swords },
  { id: 'art:pickaxe', name: 'Mining', src: pickaxe },
  { id: 'art:campfire', name: 'Survival', src: campfire },
  { id: 'art:shield', name: 'Defence', src: shield },
  { id: 'art:potion', name: 'Magic', src: potion },
  { id: 'art:chest', name: 'Loot', src: chest },
  { id: 'art:blossom', name: 'Cosy', src: blossom }
]

export const artIcon = (symbol: string) => ART_ICONS.find((a) => a.id === symbol)
