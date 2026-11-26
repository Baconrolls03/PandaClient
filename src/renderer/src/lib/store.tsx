import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Account, Instance, LaunchProgress, ProjectType, QuickPlay, Settings, Task } from '@shared/types'
import { api } from './api'
import { errorMessage } from './format'

export type Route =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'instance'; id: string; tab?: InstanceTab }
  | { name: 'discover'; type: ProjectType; instanceId?: string }
  | { name: 'project'; id: string; instanceId?: string }
  | { name: 'wardrobe' }

export type InstanceTab = 'content' | 'worlds' | 'screenshots' | 'files' | 'logs' | 'settings'

interface Toast {
  id: number
  kind: 'error' | 'success' | 'info'
  text: string
}

interface Store {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  instances: Instance[]
  refreshInstances: () => Promise<void>
  selected: Instance | null
  tasks: Task[]
  progress: LaunchProgress
  route: Route
  navigate: (r: Route) => void
  back: () => void
  canGoBack: boolean
  toasts: Toast[]
  toast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  /** Run an action and show its error as a toast. */
  attempt: <T>(fn: () => Promise<T>, success?: string) => Promise<T | undefined>
  launch: (id: string, quickPlay?: QuickPlay) => void
  stop: (id: string) => void
  running: Set<string>
  accounts: Account[]
  activeAccount: Account | null
  setAccounts: (a: Account[]) => void
  signIn: () => Promise<Account | undefined>
  online: number | null
  modal: ModalState
  openModal: (m: ModalState) => void
  closeModal: () => void
}

export type ModalState =
  | null
  | { kind: 'create-instance' }
  | { kind: 'install'; projectId: string; title: string; projectType: string }
  | { kind: 'settings'; section?: SettingsSection }

export type SettingsSection = 'appearance' | 'behavior' | 'accounts' | 'java' | 'window' | 'hooks' | 'resources' | 'about'

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

export function StoreProvider({ settings: initial, children }: { settings: Settings; children: ReactNode }) {
  const [settings, setSettings] = useState(initial)
  const [instances, setInstances] = useState<Instance[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [progress, setProgress] = useState<LaunchProgress>({ stage: 'idle', progress: null, message: '' })
  const [history, setHistory] = useState<Route[]>([{ name: 'home' }])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [modal, setModal] = useState<ModalState>(null)
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [accounts, setAccounts] = useState<Account[]>([])
  const [online, setOnline] = useState<number | null>(null)
  const toastId = useRef(0)

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }))
    api.settings.set(patch).then(setSettings)
  }, [])

  const refreshInstances = useCallback(async () => setInstances(await api.instances.list()), [])

  useEffect(() => {
    refreshInstances()
    api.tasks.list().then(setTasks)
    api.auth.list().then(setAccounts).catch(() => {})
    api.online.count().then(setOnline).catch(() => {})
    api.game.running().then((ids) => setRunning(new Set(ids))).catch(() => {})
    const onProgress = (p: LaunchProgress) => {
      setProgress(p)
      if (!p.instanceId) return
      setRunning((r) => {
        const next = new Set(r)
        if (p.stage === 'running') next.add(p.instanceId!)
        if (p.stage === 'idle' || p.stage === 'error') next.delete(p.instanceId!)
        return next
      })
    }
    const offs = [api.instances.onChanged(refreshInstances), api.tasks.onChanged(setTasks), api.game.onProgress(onProgress), api.online.onChanged(setOnline)]
    return () => offs.forEach((off) => off())
  }, [refreshInstances])

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-3), { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const attempt = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string) => {
      try {
        const r = await fn()
        if (success) toast(success, 'success')
        return r
      } catch (e) {
        toast(errorMessage(e), 'error')
        return undefined
      }
    },
    [toast]
  )

  const navigate = useCallback((r: Route) => setHistory((h) => [...h.slice(-30), r]), [])
  const back = useCallback(() => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h)), [])

  // Play bar instance: saved choice, else most recently played.
  const selected = useMemo(
    () => instances.find((i) => i.id === settings.selectedInstance) ?? instances[0] ?? null,
    [instances, settings.selectedInstance]
  )

  const activeAccount = accounts.find((a) => a.active) ?? null

  const signIn = useCallback(async () => {
    try {
      const acc = await api.auth.login()
      setAccounts(await api.auth.list())
      toast(`Signed in as ${acc.username}`, 'success')
      return acc
    } catch (e) {
      toast(errorMessage(e), 'error')
      return undefined
    }
  }, [toast])

  const launch = useCallback(
    async (id: string, quickPlay?: QuickPlay) => {
      if (settings.selectedInstance !== id) update({ selectedInstance: id })
      // No account yet: sign in first, then carry on launching.
      if (!accounts.some((a) => a.active)) {
        toast('Sign in with your Microsoft account to play.')
        if (!(await signIn())) return
      }
      api.game.launch(id, quickPlay).catch((e) => toast(errorMessage(e), 'error'))
    },
    [settings.selectedInstance, update, toast, accounts, signIn]
  )
  const stop = useCallback((id: string) => void api.game.stop(id), [])

  // Surface launch failures as toasts too.
  useEffect(() => {
    if (progress.stage === 'error' && progress.message) toast(progress.message, 'error')
  }, [progress, toast])

  const value: Store = {
    settings,
    update,
    instances,
    refreshInstances,
    selected,
    tasks,
    progress,
    route: history[history.length - 1],
    navigate,
    back,
    canGoBack: history.length > 1,
    toasts,
    toast,
    dismissToast,
    attempt,
    launch,
    stop,
    running,
    accounts,
    activeAccount,
    setAccounts,
    signIn,
    online,
    modal,
    openModal: setModal,
    closeModal: () => setModal(null)
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
