import { useEffect, useState } from 'react'
import type { Settings as SettingsT } from '@shared/types'
import { api } from '@/lib/api'
import { StoreProvider, useStore } from '@/lib/store'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { PlayBar } from '@/components/PlayBar'
import { Toasts } from '@/components/Toasts'
import { Home } from '@/pages/Home'
import { Library } from '@/pages/Library'
import { Discover } from '@/pages/Discover'
import { Project } from '@/pages/Project'
import { Wardrobe } from '@/pages/Wardrobe'
import { Friends } from '@/pages/Friends'
import { Servers } from '@/pages/Servers'
import { Stats } from '@/pages/Stats'
import { Instance } from '@/pages/instance/Instance'
import { CreateInstanceModal } from '@/modals/CreateInstanceModal'
import { InstallModal } from '@/modals/InstallModal'
import { SettingsModal } from '@/modals/SettingsModal'
import { ImportModal } from '@/modals/ImportModal'
import { IncomingShares } from '@/components/IncomingShares'
import { CrashHelper } from '@/components/CrashHelper'
import { TransferReportPopup } from '@/components/TransferReportPopup'
import { InvitePopup } from '@/components/InvitePopup'
import { useAppearance } from '@/lib/appearance'

function Shell() {
  const { route, modal, settings } = useStore()
  useAppearance(settings)
  const key = JSON.stringify(route)
  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main key={key} className="min-h-0 flex-1 animate-pop overflow-y-auto">
            {route.name === 'home' && <Home />}
            {route.name === 'library' && <Library />}
            {route.name === 'instance' && <Instance id={route.id} tab={route.tab} />}
            {route.name === 'discover' && <Discover type={route.type} instanceId={route.instanceId} />}
            {route.name === 'project' && <Project id={route.id} instanceId={route.instanceId} />}
            {route.name === 'wardrobe' && <Wardrobe />}
            {route.name === 'friends' && <Friends />}
            {route.name === 'servers' && <Servers />}
            {route.name === 'stats' && <Stats />}
          </main>
          <PlayBar />
        </div>
      </div>
      {modal?.kind === 'create-instance' && <CreateInstanceModal />}
      {modal?.kind === 'install' && <InstallModal projectId={modal.projectId} title={modal.title} projectType={modal.projectType} />}
      {modal?.kind === 'settings' && <SettingsModal section={modal.section} />}
      {modal?.kind === 'import' && <ImportModal />}
      <IncomingShares />
      <CrashHelper />
      <TransferReportPopup />
      <InvitePopup />
      <Toasts />
    </div>
  )
}

export default function App() {
  const [settings, setSettings] = useState<SettingsT | null>(null)
  useEffect(() => {
    api.settings.get().then(setSettings)
  }, [])
  if (!settings) return <div className="h-full bg-bg" />
  return (
    <StoreProvider settings={settings}>
      <Shell />
    </StoreProvider>
  )
}
