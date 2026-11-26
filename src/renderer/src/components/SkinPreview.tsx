import { useEffect, useRef } from 'react'
import { IdleAnimation, SkinViewer } from 'skinview3d'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { Cosmetic } from '@shared/types'
import { buildCosmetic, defaultSkin, disposeCosmetic, drawCape, type CosmeticMesh } from '@/lib/cosmetics'

interface Props {
  /** data: URL of the skin, or null for the PandaClient default skin. */
  skin: string | null
  slim?: boolean
  /** Equipped cosmetics (a PandaClient cape wins over a Mojang cape). */
  cosmetics: Cosmetic[]
  /** Mojang cape image (data: URL), shown when no PandaClient cape is equipped. */
  mojangCape?: string | null
  height?: number
}

/** 3D player preview (skinview3d) with PandaClient cosmetics attached. */
export function SkinPreview({ skin, slim, cosmetics, mojangCape, height = 420 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<SkinViewer | null>(null)
  const meshes = useRef<CosmeticMesh[]>([])

  // Create the viewer once.
  useEffect(() => {
    const canvas = canvasRef.current!
    const viewer = new SkinViewer({ canvas, width: canvas.clientWidth || 300, height, zoom: 0.85, fov: 50 })
    viewer.animation = new IdleAnimation()
    viewer.autoRotate = true
    viewer.autoRotateSpeed = 0.6
    viewer.controls.enablePan = false
    viewer.background = null
    viewer.globalLight.intensity = 2.4
    viewer.cameraLight.intensity = 0.9
    viewerRef.current = viewer
    const resize = new ResizeObserver(() => viewer.setSize(canvas.parentElement!.clientWidth, height))
    resize.observe(canvas.parentElement!)
    // Stop spinning once the user grabs the model.
    const stopSpin = () => (viewer.autoRotate = false)
    canvas.addEventListener('pointerdown', stopSpin)
    // Wing beat.
    let raf = 0
    const tick = () => {
      const t = performance.now() / 1000
      for (const m of meshes.current) for (const f of m.flaps) f.pivot.rotation.y = (Math.sin(t * 2.2) * 0.5 + 0.5) * ((f.flap * Math.PI) / 180)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', stopSpin)
      resize.disconnect()
      viewer.dispose()
      viewerRef.current = null
    }
  }, [height])

  // Skin
  useEffect(() => {
    const v = viewerRef.current
    if (!v) return
    if (skin) void v.loadSkin(skin, { model: slim ? 'slim' : 'default' })
    else v.loadSkin(defaultSkin(), { model: 'default' })
  }, [skin, slim])

  // Cape + box cosmetics
  useEffect(() => {
    const v = viewerRef.current
    if (!v) return
    const cape = cosmetics.find((c) => c.category === 'cape')
    if (cape) v.loadCape(drawCape(cape))
    else if (mojangCape) void v.loadCape(mojangCape)
    else v.loadCape(null)

    for (const m of meshes.current) disposeCosmetic(m.group)
    meshes.current = []
    for (const c of cosmetics) {
      if (c.category === 'cape' || !c.model.boxes) continue
      const m = buildCosmetic(c)
      const part = c.model.space === 'body' ? v.playerObject.skin.body : v.playerObject.skin.head
      part.add(m.group)
      meshes.current.push(m)
    }
  }, [cosmetics, mojangCape])

  const zoom = (d: number) => {
    const v = viewerRef.current
    if (v) v.zoom = Math.max(0.4, Math.min(1.6, v.zoom + d))
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="block w-full cursor-grab active:cursor-grabbing" style={{ height }} />
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-surface/90 p-1 shadow-soft backdrop-blur">
        <button aria-label="Zoom out" onClick={() => zoom(-0.15)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-text">
          <Minus size={15} />
        </button>
        <button
          onClick={() => {
            const v = viewerRef.current
            if (!v) return
            v.zoom = 0.85
            v.controls.reset()
            v.autoRotate = true
          }}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted hover:bg-raised hover:text-text"
        >
          <RotateCcw size={13} /> Reset
        </button>
        <button aria-label="Zoom in" onClick={() => zoom(0.15)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-text">
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}
