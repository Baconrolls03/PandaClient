import * as L from 'lucide-react'
import type { IconPreset } from '@shared/types'
import { ART_ICONS, artIcon } from './iconArt'

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

export function randomPreset(): IconPreset {
  // Mostly PandaClient's own artwork; sometimes a symbol on a colour.
  if (Math.random() < 0.8) return { bg: 'night', symbol: ART_ICONS[Math.floor(Math.random() * ART_ICONS.length)].id }
  const symbols = Object.keys(ICON_SYMBOLS)
  return { bg: ICON_BACKGROUNDS[Math.floor(Math.random() * ICON_BACKGROUNDS.length)].id, symbol: symbols[Math.floor(Math.random() * symbols.length)] }
}

const ART_FOR: [RegExp, string][] = [
  [/sword|target|bomb|skull|ghost|zap|medal/, 'art:swords'],
  [/pickaxe|axe|shovel|hammer|mountain|snowy|cpu|magnet|anchor/, 'art:pickaxe'],
  [/panda|cat|dog|rabbit|squirrel|rat|bird|fish|turtle|snail|bug|paw|bone|egg|feather|shell|bot/, 'art:panda'],
  [/shield|castle|house|key|crown|pyramid/, 'art:shield'],
  [/flask|wand|gem|diamond|potion|atom|orbit|telescope|satellite|moon|sparkles|star|infinity|lightbulb/, 'art:potion'],
  [/box|package|gift|trophy|map|compass|scroll|hourglass|dice|puzzle|joystick|gamepad|rocket|ship/, 'art:chest'],
  [/flame|sun|tent|cookie|cake|pizza|candy|carrot|wheat|apple|citrus/, 'art:campfire'],
  [/tree|leaf|sprout|flower|clover|cherry|grape|waves|cloud|snowflake|tornado|globe|heart|music|palette|brush/, 'art:blossom']
]
/** The PandaClient artwork closest to an older symbol icon. */
function artForSymbol(symbol: string): string {
  for (const [re, id] of ART_FOR) if (re.test(symbol)) return id
  return ART_ICONS[Math.abs([...symbol].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % ART_ICONS.length].id
}

/** Draws a preset icon: gradient tile with a symbol, sized like an image. */
export function PresetIcon({ preset, size, className = '' }: { preset: IconPreset; size: number; className?: string }) {
  const art = artIcon(preset.symbol) ?? artIcon(artForSymbol(preset.symbol))
  if (art)
    return (
      <div className={`shrink-0 overflow-hidden rounded-xl shadow-[0_4px_12px_-4px_rgb(0_0_0/0.5)] ${className}`} style={{ width: size, height: size }}>
        <img src={art.src} alt={art.name} draggable={false} className="size-full scale-[1.12] object-cover" />
      </div>
    )
  const bg = backgroundOf(preset.bg)
  const Symbol = ICON_SYMBOLS[preset.symbol] ?? L.Box
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-xl shadow-[inset_0_-6px_12px_rgb(0_0_0/0.12),inset_0_2px_0_rgb(255_255_255/0.25)] ${className}`}
      style={{ width: size, height: size, background: `linear-gradient(145deg, ${bg.from}, ${bg.to})` }}
    >
      <Symbol size={Math.round(size * 0.52)} strokeWidth={size >= 48 ? 2.1 : 2.4} color={bg.dark ? '#141B24' : '#FFFFFF'} className="drop-shadow-[0_1px_1px_rgb(0_0_0/0.18)]" />
    </div>
  )
}
