import { Package } from 'lucide-react'

export function Mods() {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-surface shadow-soft">
          <Package size={24} className="text-blue" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Mod browser coming soon</h1>
        <p className="mt-2 text-sm text-muted">
          Search and install thousands of mods, resource packs and shaders straight from Modrinth.
        </p>
      </div>
    </div>
  )
}
