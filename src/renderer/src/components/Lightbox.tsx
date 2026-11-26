import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export function Lightbox({ images, index, onIndex, onClose }: { images: { url: string; title?: string | null }[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onIndex])
  const img = images[index]
  return (
    <div className="fixed inset-0 z-50 flex animate-pop items-center justify-center bg-black/85 p-10 backdrop-blur" onClick={onClose}>
      <img src={img.url} alt="" className="max-h-full max-w-full rounded-xl shadow-lift" onClick={(e) => e.stopPropagation()} />
      {img.title && <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1.5 text-sm">{img.title}</p>}
      <button aria-label="Close" className="absolute right-5 top-14 grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20" onClick={onClose}>
        <X size={18} />
      </button>
      {images.length > 1 && (
        <>
          <button
            aria-label="Previous"
            className="absolute left-5 grid size-11 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index - 1 + images.length) % images.length)
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            aria-label="Next"
            className="absolute right-5 grid size-11 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index + 1) % images.length)
            }}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  )
}
