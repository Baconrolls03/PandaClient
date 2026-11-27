import { useEffect, useRef, useState } from 'react'
import { BarChart3, ChevronLeft, Copy as RestoreIcon, Download, FolderOpen, Globe, LogIn, LogOut, Minus, Plus, Square, Settings as SettingsIcon, Users, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore, type Route } from '@/lib/store'
import { Logo } from './Logo'
import { UpdatePill } from './UpdatePill'
import { SkinHead } from './AccountCard'
import { TasksPanel } from './TasksPanel'

const TABS: { label: string; route: Route; match: Route['name'][] }[] = [
  { label: 'Home', route: { name: 'home' }, match: ['home'] },
  { label: 'Profiles', route: { name: 'library' }, match: ['library', 'instance'] },
  { label: 'Browse', route: { name: 'discover', type: 'mod' }, match: ['discover', 'project'] },
  { label: 'Wardrobe', route: { name: 'wardrobe' }, match: ['wardrobe'] }
]

function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [open, close])
  return ref
}

/** The account button and its menu: stats, settings, quick switches, sign out. */
function AccountMenu() {
  const { accounts, activeAccount, setAccounts, signIn, openModal, navigate, attempt, settings, update } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false))
  const go = (fn: () => void) => () => (setOpen(false), fn())
  if (!activeAccount)
    return (
      <button onClick={() => signIn()} className="no-drag flex h-8 items-center gap-2 rounded-lg bg-blue px-3 text-xs font-semibold text-white transition-colors hover:brightness-110">
        <LogIn size={14} /> Sign in
      </button>
    )
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-raised hover:text-text'
  return (
    <div ref={ref} className="no-drag relative">
      <button onClick={() => setOpen((o) => !o)} className={`flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors ${open ? 'bg-raised' : 'hover:bg-raised'}`}>
        <SkinHead account={activeAccount} size={24} className="rounded-md" />
        <span className="max-w-28 truncate text-xs font-semibold">{activeAccount.username}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 animate-pop rounded-2xl border border-border bg-surface p-2 shadow-lift">
          <div className="flex items-center gap-2.5 px-2 pb-2 pt-1">
            <SkinHead account={activeAccount} size={32} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{activeAccount.username}</div>
              <div className="text-[11px] text-mint">Online</div>
            </div>
          </div>
          <div className="my-1 h-px bg-border" />
          <button className={item} onClick={go(() => navigate({ name: 'stats' }))}>
            <BarChart3 size={15} /> Stats
          </button>
          <button className={item} onClick={go(() => navigate({ name: 'servers' }))}>
            <Globe size={15} /> Servers
          </button>
          <button className={item} onClick={go(() => openModal({ kind: 'settings' }))}>
            <SettingsIcon size={15} /> Settings
          </button>
          <div className="my-1 px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Quick settings</div>
          <div className="grid grid-cols-2 gap-1.5 px-1 pb-1">
            <button
              onClick={() => update({ theme: settings.theme === 'light' ? 'default' : 'light' })}
              className={`rounded-xl px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${settings.theme !== 'light' ? 'bg-blue text-white' : 'bg-raised text-muted'}`}
            >
              Dark mode
              <span className="block font-normal opacity-80">{settings.theme !== 'light' ? 'On' : 'Off'}</span>
            </button>
            <button
              onClick={() => update({ cloudSync: !settings.cloudSync })}
              className={`rounded-xl px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${settings.cloudSync ? 'bg-blue text-white' : 'bg-raised text-muted'}`}
            >
              Cloud sync
              <span className="block font-normal opacity-80">{settings.cloudSync ? 'On' : 'Off'}</span>
            </button>
          </div>
          {accounts.length > 1 && (
            <>
              <div className="my-1 h-px bg-border" />
              {accounts
                .filter((a) => !a.active)
                .map((a) => (
                  <button key={a.uuid} className={item} onClick={go(async () => { const l = await attempt(() => api.auth.setActive(a.uuid)); if (l) setAccounts(l) })}>
                    <SkinHead account={a} size={18} className="rounded" /> Switch to {a.username}
                  </button>
                ))}
            </>
          )}
          <div className="my-1 h-px bg-border" />
          <div className="flex items-center justify-between">
            <button className={`${item} w-auto`} onClick={go(() => api.system.openPath(settings.gameDir))}>
              <FolderOpen size={14} /> Open folder
            </button>
            <button className={`${item} w-auto`} onClick={go(() => signIn())} title="Add another account">
              <Plus size={14} />
            </button>
            <button
              className={`${item} w-auto hover:text-danger`}
              onClick={go(async () => { const l = await attempt(() => api.auth.logout(activeAccount.uuid), `Signed out ${activeAccount.username}`); if (l) setAccounts(l) })}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** OneClient-style top bar: logo, page tabs in the middle, friends / downloads / account on the right. */
export function TopNav() {
  const { route, navigate, back, canGoBack, tasks, openModal } = useStore()
  const [win, setWin] = useState({ maximized: false, fullscreen: false })
  useEffect(() => api.window.onState(setWin), [])
  // F11: full screen on/off.
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'F11' && (e.preventDefault(), api.window.fullscreen())
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  const [tasksOpen, setTasksOpen] = useState(false)
  const tasksRef = useOutside<HTMLDivElement>(tasksOpen, () => setTasksOpen(false))
  const busy = tasks.filter((t) => t.status === 'running').length
  const iconBtn = 'no-drag relative grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-text'
  return (
    <header onDoubleClick={(e) => e.target === e.currentTarget && api.window.maximize()} className="drag relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-bg/80 pl-5 backdrop-blur-md">
      <button onClick={() => navigate({ name: 'home' })} className="no-drag flex items-center gap-2.5">
        <Logo size={22} />
        <span className="text-[15px] font-extrabold tracking-[0.14em]">PANDACLIENT</span>
      </button>
      {canGoBack && route.name !== 'home' && (
        <button aria-label="Back" onClick={back} className={iconBtn}>
          <ChevronLeft size={16} />
        </button>
      )}
      <nav className="no-drag absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
        {TABS.map((t) => {
          const on = t.match.includes(route.name)
          return (
            <button
              key={t.label}
              onClick={() => navigate(t.route)}
              className={`relative rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${on ? 'text-text' : 'text-muted hover:text-text'}`}
            >
              {t.label}
              {on && <span className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-blue" />}
            </button>
          )
        })}
      </nav>
      <div className="ml-auto flex h-full items-center gap-1.5">
        <UpdatePill />
        <button aria-label="Friends" title="Friends and party" onClick={() => navigate({ name: 'friends' })} className={`${iconBtn} ${route.name === 'friends' ? 'bg-raised text-text' : ''}`}>
          <Users size={16} />
        </button>
        <div ref={tasksRef} className="relative">
          <button aria-label="Downloads" title="Downloads" onClick={() => setTasksOpen((o) => !o)} className={iconBtn}>
            <Download size={16} />
            {busy > 0 && <span className="absolute right-1 top-1 size-2 animate-pulse rounded-full bg-blue" />}
          </button>
          {tasksOpen && (
            <div className="no-drag absolute right-0 top-[calc(100%+8px)] [&>div]:static [&>div]:bottom-auto">
              <TasksPanel />
            </div>
          )}
        </div>
        <button aria-label="Settings" title="Settings" onClick={() => openModal({ kind: 'settings' })} className={iconBtn}>
          <SettingsIcon size={16} />
        </button>
        <AccountMenu />
        <div className="no-drag ml-1 flex h-full">
          <button aria-label="Minimise" onClick={() => api.window.minimize()} className="grid h-full w-11 place-items-center text-muted transition-colors hover:bg-raised hover:text-text">
            <Minus size={16} />
          </button>
          <button
            aria-label={win.maximized ? 'Restore' : 'Maximise'}
            title={win.fullscreen ? 'Exit full screen (F11)' : win.maximized ? 'Restore' : 'Maximise (F11 for full screen)'}
            onClick={() => (win.fullscreen ? api.window.fullscreen() : api.window.maximize())}
            className="grid h-full w-11 place-items-center text-muted transition-colors hover:bg-raised hover:text-text"
          >
            {win.maximized || win.fullscreen ? <RestoreIcon size={13} /> : <Square size={13} />}
          </button>
          <button aria-label="Close" onClick={() => api.window.close()} className="grid h-full w-11 place-items-center text-muted transition-colors hover:bg-danger hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

