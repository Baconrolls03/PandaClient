import { useEffect } from 'react'
import { DEFAULT_ACCENT, type Settings } from '@shared/types'

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Relative luminance, to pick readable text on top of the accent. */
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))))) as [number, number, number]
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** Push theme, accent, size, effects and motion settings onto <html>. */
export function useAppearance(s: Settings): void {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
      const theme = s.theme === 'system' ? (prefersLight ? 'light' : 'default') : s.theme
      root.dataset.theme = theme
      const accent = /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : DEFAULT_ACCENT
      root.style.setProperty('--color-mint', accent)
      root.style.setProperty('--color-mint-deep', shade(accent, 0.18))
      root.style.setProperty('--color-ink', luminance(hexToRgb(accent)) > 0.38 ? '#0b1a10' : '#ffffff')
      root.dataset.effects = s.effects ? 'on' : 'off'
      root.dataset.motion = s.reduceMotion ? 'reduce' : 'full'
      root.style.setProperty('zoom', String(s.uiScale / 100))
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [s.theme, s.accent, s.effects, s.reduceMotion, s.uiScale])
}

export const ACCENTS: { name: string; hex: string }[] = [
  { name: 'Panda mint', hex: DEFAULT_ACCENT },
  { name: 'Ocean', hex: '#4F8CFF' },
  { name: 'Grape', hex: '#9B7BFF' },
  { name: 'Candy', hex: '#FF6FB5' },
  { name: 'Sunset', hex: '#FF8A4C' },
  { name: 'Gold', hex: '#F5C542' },
  { name: 'Teal', hex: '#2DD4BF' },
  { name: 'Cherry', hex: '#F26D6D' }
]
