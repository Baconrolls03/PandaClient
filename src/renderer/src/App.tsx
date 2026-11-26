import { useCallback, useEffect, useState } from 'react'
import type { Settings as SettingsT } from '@shared/types'
import { api } from '@/lib/api'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar, type Page } from '@/components/Sidebar'
import { Home } from '@/pages/Home'
import { Settings } from '@/pages/Settings'
import { Mods } from '@/pages/Mods'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [settings, setSettings] = useState<SettingsT | null>(null)

  useEffect(() => {
    api.settings.get().then(setSettings)
  }, [])

  const update = useCallback((patch: Partial<SettingsT>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s)) // optimistic
    api.settings.set(patch).then(setSettings)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar page={page} onNavigate={setPage} />
        <main key={page} className="min-w-0 flex-1 animate-pop overflow-y-auto">
          {settings &&
            (page === 'home' ? (
              <Home settings={settings} update={update} />
            ) : page === 'settings' ? (
              <Settings settings={settings} update={update} />
            ) : (
              <Mods />
            ))}
        </main>
      </div>
    </div>
  )
}
