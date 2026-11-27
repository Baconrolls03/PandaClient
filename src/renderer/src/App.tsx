import { useEffect, useState } from 'react'
import type { Settings as SettingsT } from '@shared/types'
import { api } from '@/lib/api'
import { StoreProvider, useStore } from '@/lib/store'
import { TopNav } from '@/components/TopNav'
import { LaunchToast } from '@/components/LaunchToast'
import { Toasts } from '@/components/Toasts'
import { Home } from '@/pages/Home'
import { Library } from '@/pages/Library'
import { Discover } from '@/pages/Discover'
import { Project } from '@/pages/Project'
import { Wardrobe } from '@/pages/Wardrobe'
import { Friends } from '@/pages/Friends'
import { Servers } from '@/pages/Servers'
import { Stats } from '@/pages/Stats'
import { PlayTabs } from '@/components/PlayTabs'
import { FirstRun } from '@/components/FirstRun'
import { Instance } from '@/pages/instance/Instance'
import { CreateInstanceModal } from '@/modals/CreateInstanceModal'
import { InstallModal } from '@/modals/InstallModal'
import { SettingsModal } from '@/modals/SettingsModal'
import { ImportModal } from '@/modals/ImportModal'
import { IncomingShares } from '@/components/IncomingShares'
import { CrashHelper } from '@/components/CrashHelper'
import { TransferReportPopup } from '@/components/TransferReportPopup'
import { InvitePopup, PartyInvitePopup } from '@/components/InvitePopup'
import { useAppearance } from '@/lib/appearance'

function Shell() {
  const { route, modal, settings } = useStore()
  useAppearance(settings)
  const key = JSON.stringify(route)
  return (
    <div className="flex h-full flex-col">
      <TopNav />
      <main key={key} className="min-h-0 flex-1 animate-pop overflow-y-auto">
        {(route.name === 'servers' || route.name === 'stats') && <PlayTabs active={route.name} />}
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
      <LaunchToast />
      {modal?.kind === 'create-instance' && <CreateInstanceModal />}
      {modal?.kind === 'install' && <InstallModal projectId={modal.projectId} title={modal.title} projectType={modal.projectType} />}
      {modal?.kind === 'settings' && <SettingsModal section={modal.section} />}
      {modal?.kind === 'import' && <ImportModal />}
      <IncomingShares />
      <CrashHelper />
      <FirstRun />
      <TransferReportPopup />
      <InvitePopup />
      <PartyInvitePopup />
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
