import * as L from 'lucide-react'
import type { IconPreset } from '@shared/types'

/** Instance icon backgrounds: two-stop gradients. `dark` = draw the symbol in ink instead of white. */
export const ICON_BACKGROUNDS: { id: string; name: string; from: string; to: string; dark?: boolean }[] = [
  { id: 'mint', name: 'Mint', from: '#86EBA3', to: '#3DBE6A', dark: true },
  { id: 'forest', name: 'Forest', from: '#3FAE6A', to: '#1E6B45' },
  { id: 'lime', name: 'Lime', from: '#C6F36B', to: '#7BCB2E', dark: true },
  { id: 'teal', name: 'Teal', from: '#4FE0C8', to: '#169C9C' },
  { id: 'sky', name: 'Sky', from: '#7CC4FF', to: '#3D7BEA' },
  { id: 'ocean', name: 'Ocean', from: '#4F8CFF', to: '#2B3FBF' },
  { id: 'grape', name: 'Grape', from: '#B38CFF', to: '#6A3FD8' },
  { id: 'candy', name: 'Candy', from: '#FF9AD5', to: '#E0479E' },
  { id: 'rose', name: 'Rose', from: '#FF8A8A', to: '#D93F55' },
  { id: 'sunset', name: 'Sunset', from: '#FFB36B', to: '#F0603A' },
  { id: 'gold', name: 'Gold', from: '#FFE07A', to: '#F0A92E', dark: true },
  { id: 'sand', name: 'Sand', from: '#F2DDB3', to: '#C9A46A', dark: true },
  { id: 'cocoa', name: 'Cocoa', from: '#B9825B', to: '#6E4630' },
  { id: 'slate', name: 'Slate', from: '#8B98A9', to: '#4A5668' },
  { id: 'night', name: 'Night', from: '#2A3546', to: '#10151D' },
  { id: 'snow', name: 'Snow', from: '#FFFFFF', to: '#D9E1EA', dark: true }
]

type Icon = L.LucideIcon
/** Symbols grouped for the editor. Ids are stable (saved in instance.json). */
export const ICON_GROUPS: { name: string; icons: Record<string, Icon> }[] = [
  {
    name: 'Adventure',
    icons: { pickaxe: L.Pickaxe, sword: L.Sword, swords: L.Swords, axe: L.Axe, shovel: L.Shovel, hammer: L.Hammer, shield: L.Shield, crown: L.Crown, gem: L.Gem, diamond: L.Diamond, key: L.Key, bomb: L.Bomb, map: L.Map, compass: L.Compass, scroll: L.Scroll, trophy: L.Trophy, medal: L.Medal, target: L.Target }
  },
  {
    name: 'Creatures',
    icons: { panda: L.Panda, cat: L.Cat, dog: L.Dog, rabbit: L.Rabbit, squirrel: L.Squirrel, rat: L.Rat, bird: L.Bird, fish: L.Fish, turtle: L.Turtle, snail: L.Snail, bug: L.Bug, paw: L.PawPrint, bone: L.Bone, egg: L.Egg, feather: L.Feather, shell: L.Shell, skull: L.Skull, ghost: L.Ghost, bot: L.Bot }
  },
  {
    name: 'World',
    icons: { tree: L.TreePine, trees: L.Trees, leaf: L.Leaf, sprout: L.Sprout, flower: L.Flower2, clover: L.Clover, mountain: L.Mountain, snowy: L.MountainSnow, waves: L.Waves, sun: L.Sun, moon: L.Moon, snowflake: L.Snowflake, cloud: L.Cloud, tornado: L.Tornado, flame: L.Flame, zap: L.Zap, globe: L.Globe, orbit: L.Orbit, telescope: L.Telescope, satellite: L.Satellite }
  },
  {
    name: 'Builds',
    icons: { castle: L.Castle, house: L.House, tent: L.Tent, pyramid: L.Pyramid, anchor: L.Anchor, ship: L.Ship, rocket: L.Rocket, box: L.Box, boxes: L.Boxes, package: L.Package, hexagon: L.Hexagon, cpu: L.Cpu, atom: L.Atom, magnet: L.Magnet, hourglass: L.Hourglass, lightbulb: L.Lightbulb, flask: L.FlaskConical, wand: L.WandSparkles }
  },
  {
    name: 'Food & fun',
    icons: { apple: L.Apple, cherry: L.Cherry, carrot: L.Carrot, wheat: L.Wheat, grape: L.Grape, citrus: L.Citrus, cookie: L.Cookie, cake: L.Cake, pizza: L.Pizza, candy: L.Candy, gift: L.Gift, gamepad: L.Gamepad2, joystick: L.Joystick, dice: L.Dice5, puzzle: L.Puzzle, music: L.Music, palette: L.Palette, brush: L.Brush, heart: L.Heart, star: L.Star, sparkles: L.Sparkles, infinity: L.Infinity }
  }
]

export const ICON_SYMBOLS: Record<string, Icon> = Object.assign({}, ...ICON_GROUPS.map((g) => g.icons))

export const backgroundOf = (id: string) => ICON_BACKGROUNDS.find((b) => b.id === id) ?? ICON_BACKGROUNDS[0]

// The order they appear in the editor.
const ORDER = ['grass', 'workbench', 'furnace', 'chest', 'bookshelf', 'redore', 'slime', 'cake', 'campfire', 'pickaxe', 'sword', 'dynamite', 'lantern', 'panda', 'bear', 'shark', 'fox', 'pig', 'bee', 'amethyst', 'anvil', 'pan', 'armchair', 'globe', 'map', 'wand', 'potion', 'trophy', 'computer', 'beacon', 'gold']

/** PandaClient's isometric voxel symbols (made for PandaClient), keyed "vox:<name>". */
const VOX_FILES = import.meta.glob('@/assets/symbols/*.png', { eager: true, import: 'default' }) as Record<string, string>
export const VOX_SYMBOLS: { id: string; name: string; src: string }[] = Object.entries(VOX_FILES)
  .map(([path, src]) => {
    const name = path.split('/').pop()!.replace('.png', '')
    return { id: `vox:${name}`, name: name.charAt(0).toUpperCase() + name.slice(1), src }
  })
  .sort((a, b) => ORDER.indexOf(a.id.slice(4)) - ORDER.indexOf(b.id.slice(4)))

// Older icons (line symbols and the first PandaClient artwork) shown as the closest voxel symbol.
const VOX_FOR: [RegExp, string][] = [
  [/art:panda|panda/, 'panda'], [/art:swords|sword|target|medal/, 'sword'], [/art:pickaxe|pickaxe|axe|shovel|hammer/, 'pickaxe'],
  [/art:campfire|flame|tent/, 'campfire'], [/art:shield|shield|castle|crown/, 'beacon'], [/art:potion|flask|potion/, 'potion'],
  [/art:chest|box|package|gift|chest/, 'chest'], [/art:blossom|flower|clover|sprout|leaf/, 'bee'], [/tree|trees|mountain|snowy/, 'grass'],
  [/cat|dog|rabbit|squirrel|rat|paw/, 'fox'], [/bird|fish|turtle|waves|anchor|ship/, 'shark'], [/bug|snail/, 'bee'], [/egg|bone|skull|ghost/, 'slime'],
  [/gem|diamond|sparkles|star|atom|orbit/, 'amethyst'], [/wand|lightbulb|telescope|satellite|moon|sun/, 'wand'], [/map|compass|scroll|globe/, 'map'],
  [/trophy|key|hourglass/, 'trophy'], [/cpu|bot|joystick|gamepad|dice|puzzle|zap|magnet/, 'computer'], [/bomb/, 'dynamite'],
  [/cake|cookie|candy|pizza|apple|cherry|carrot|wheat|grape|citrus/, 'cake'], [/house|pyramid|hexagon|boxes/, 'workbench'], [/heart|music|palette|brush|infinity/, 'pig']
]
export function voxOf(symbol: string): { id: string; name: string; src: string } {
  const direct = VOX_SYMBOLS.find((v) => v.id === symbol)
  if (direct) return direct
  for (const [re, name] of VOX_FOR) if (re.test(symbol)) return VOX_SYMBOLS.find((v) => v.id === `vox:${name}`) ?? VOX_SYMBOLS[0]
  return VOX_SYMBOLS[Math.abs([...symbol].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % VOX_SYMBOLS.length]
}

export function randomPreset(): IconPreset {
  return {
    bg: ICON_BACKGROUNDS[Math.floor(Math.random() * ICON_BACKGROUNDS.length)].id,
    symbol: VOX_SYMBOLS[Math.floor(Math.random() * VOX_SYMBOLS.length)].id
  }
}

/** A profile icon: a colour tile with a voxel symbol on it (like the Modrinth App's icon editor). */
export function PresetIcon({ preset, size, className = '' }: { preset: IconPreset; size: number; className?: string }) {
  const bg = backgroundOf(preset.bg)
  const sym = voxOf(preset.symbol)
  const d = Math.max(1, Math.round(size * 0.04))
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-xl shadow-[inset_0_-6px_12px_rgb(0_0_0/0.12),inset_0_2px_0_rgb(255_255_255/0.25)] ${className}`}
      style={{ width: size, height: size, background: `linear-gradient(145deg, ${bg.from}, ${bg.to})` }}
    >
      <img
        src={sym.src}
        alt={sym.name}
        draggable={false}
        style={{ width: size * 0.72, height: size * 0.72, filter: `drop-shadow(${d}px ${d * 1.5}px 0 rgb(0 0 0 / 0.28))` }}
      />
    </div>
  )
}
