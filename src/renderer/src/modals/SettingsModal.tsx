import { useEffect, useState, type ReactNode } from 'react'
import {
  AppWindow,
  Check,
  Code2,
  Coffee,
  FolderOpen,
  Gauge,
  Info,
  Loader2,
  LogOut,
  Monitor,
  Paintbrush,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  X,
  type LucideIcon
} from 'lucide-react'
import { DEFAULT_ACCENT, type JavaInstall, type Settings, type SystemInfo, type ThemeId } from '@shared/types'
import { api } from '@/lib/api'
import { ACCENTS } from '@/lib/appearance'
import { gb } from '@/lib/format'
import { useStore, type SettingsSection } from '@/lib/store'
import { MicrosoftMark, SkinHead } from '@/components/AccountCard'
import { Logo } from '@/components/Logo'
import { Button, TextField, Toggle } from '@/components/ui'
import { useUpdateState } from '@/components/UpdatePill'

const NAV: { group: string; items: { id: SettingsSection; label: string; icon: LucideIcon }[] }[] = [
  { group: 'Display', items: [{ id: 'appearance', label: 'Appearance', icon: Paintbrush }, { id: 'behavior', label: 'Behavior', icon: SlidersHorizontal }] },
  { group: 'Account', items: [{ id: 'accounts', label: 'Minecraft accounts', icon: Users }] },
  {
    group: 'Profile defaults',
    items: [
      { id: 'java', label: 'Memory', icon: Coffee },
      { id: 'window', label: 'Window', icon: AppWindow },
      { id: 'hooks', label: 'Launch hooks', icon: Code2 }
    ]
  },
  { group: 'System', items: [{ id: 'resources', label: 'Resources', icon: Gauge }, { id: 'about', label: 'About', icon: Info }] }
]

function Row({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        {text && <div className="mt-0.5 text-[13px] text-muted">{text}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Heading({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-2 mt-1">
      <h3 className="text-base font-bold">{children}</h3>
      {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
    </div>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-bg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${value === o.value ? 'bg-mint text-ink' : 'text-muted hover:text-text'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Slider({ min, max, step, value, onChange, format }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className="flex w-80 items-center gap-4">
      <input type="range" className="panda-range flex-1" min={min} max={max} step={step} value={value} style={{ ['--fill' as string]: `${fill}%` }} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="w-20 rounded-xl bg-raised py-1.5 text-center text-sm font-semibold tabular-nums">{format(value)}</div>
    </div>
  )
}

/** Mini mock-up of the app in a given theme, for the theme picker. */
function ThemePreview({ theme }: { theme: Exclude<ThemeId, 'system'> }) {
  const c = {
    default: { bg: '#0F141C', surface: '#161D27', line: '#263140', text: '#8B98A9' },
    light: { bg: '#EEF1F5', surface: '#FFFFFF', line: '#D8DEE6', text: '#5B6878' },
    oled: { bg: '#000000', surface: '#0A0D11', line: '#1E252E', text: '#8B98A9' }
  }[theme]
  return (
    <div className="flex h-20 gap-2 rounded-t-xl p-3" style={{ background: c.bg }}>
      <div className="w-6 rounded-md" style={{ background: c.surface, border: `1px solid ${c.line}` }} />
      <div className="flex flex-1 flex-col gap-1.5 rounded-md p-2" style={{ background: c.surface, border: `1px solid ${c.line}` }}>
        <div className="h-1.5 w-3/4 rounded-full" style={{ background: c.text }} />
        <div className="h-1.5 w-1/2 rounded-full" style={{ background: c.line }} />
        <div className="mt-auto h-2.5 w-10 rounded-full bg-mint" />
      </div>
    </div>
  )
}

function Appearance({ s, update }: { s: Settings; update: (p: Partial<Settings>) => void }) {
  const themes: { id: ThemeId; name: string; note?: string }[] = [
    { id: 'default', name: 'PandaClient', note: 'Default' },
    { id: 'light', name: 'Light' },
    { id: 'oled', name: 'OLED' },
    { id: 'system', name: 'Sync with system' }
  ]
  return (
    <>
      <Heading sub="Pick the colours for the whole launcher.">Colour theme</Heading>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => update({ theme: t.id })}
            className={`overflow-hidden rounded-xl border-2 text-left transition-all hover:-translate-y-px ${s.theme === t.id ? 'border-mint' : 'border-border'}`}
          >
            {t.id === 'system' ? (
              <div className="flex h-20">
                <div className="flex-1 overflow-hidden"><ThemePreview theme="default" /></div>
                <div className="flex-1 overflow-hidden"><ThemePreview theme="light" /></div>
              </div>
            ) : (
              <ThemePreview theme={t.id} />
            )}
            <div className="flex items-center gap-2 bg-surface px-3 py-2 text-xs font-semibold">
              <span className={`grid size-4 place-items-center rounded-full border-2 ${s.theme === t.id ? 'border-mint bg-mint' : 'border-border'}`}>{s.theme === t.id && <span className="size-1.5 rounded-full bg-ink" />}</span>
              {t.name}
              {t.note && <span className="ml-auto text-[10px] font-medium text-muted">{t.note}</span>}
            </div>
          </button>
        ))}
      </div>

      <Heading sub="Buttons, highlights and toggles use this colour.">Accent colour</Heading>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {ACCENTS.map((a) => (
          <button
            key={a.hex}
            title={a.name}
            onClick={() => update({ accent: a.hex })}
            className={`grid size-9 place-items-center rounded-full transition-transform hover:scale-110 ${s.accent.toLowerCase() === a.hex.toLowerCase() ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''}`}
            style={{ background: a.hex }}
          >
            {s.accent.toLowerCase() === a.hex.toLowerCase() && <Check size={16} color="#0b1a10" />}
          </button>
        ))}
        <label className="relative grid size-9 cursor-pointer place-items-center rounded-full border-2 border-dashed border-border text-muted hover:text-text" title="Custom colour">
          <Plus size={16} />
          <input type="color" value={s.accent} onChange={(e) => update({ accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        {s.accent.toLowerCase() !== DEFAULT_ACCENT.toLowerCase() && (
          <Button size="sm" variant="ghost" onClick={() => update({ accent: DEFAULT_ACCENT })}>
            <RotateCcw size={13} /> Reset
          </Button>
        )}
      </div>

      <Row title="Interface size" text="Make everything bigger or smaller.">
        <Slider min={75} max={150} step={5} value={s.uiScale} onChange={(v) => update({ uiScale: v })} format={(v) => `${v}%`} />
      </Row>
      <Row title="Visual effects" text="Glows and blurred backgrounds. Turn off if the launcher feels slow.">
        <Toggle label="Visual effects" checked={s.effects} onChange={(v) => update({ effects: v })} />
      </Row>
      <Row title="Reduce motion" text="Turn off hover lifts and animations.">
        <Toggle label="Reduce motion" checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
      </Row>
    </>
  )
}

function Behavior({ s, update }: { s: Settings; update: (p: Partial<Settings>) => void }) {
  const sections: { key: keyof Settings['homeSections']; label: string }[] = [
    { key: 'popularModpacks', label: 'Popular modpacks' },
    { key: 'trendingMods', label: 'Trending mods' },
    { key: 'news', label: "What's new" }
  ]
  return (
    <>
      <Heading>When Minecraft starts</Heading>
      <Row title="Launcher window" text="Close fully frees memory, but play time won't be tracked.">
        <Segmented
          value={s.onLaunch}
          onChange={(v) => update({ onLaunch: v })}
          options={[
            { value: 'nothing', label: 'Keep open' },
            { value: 'minimize', label: 'Minimize' },
            { value: 'close', label: 'Close' }
          ]}
        />
      </Row>
      <Row title="Bring PandaClient back when Minecraft closes">
        <Toggle label="Refocus" checked={s.refocusOnExit} onChange={(v) => update({ refocusOnExit: v })} />
      </Row>
      <Heading>Home and library</Heading>
      <Row title="Compact library" text="Show profiles as a list instead of cards.">
        <Toggle label="Compact library" checked={s.compactLibrary} onChange={(v) => update({ compactLibrary: v })} />
      </Row>
      <Row title="Show play time" text="How long you've played each profile.">
        <Toggle label="Show play time" checked={s.showPlayTime} onChange={(v) => update({ showPlayTime: v })} />
      </Row>
      <Row title="Recent profiles in the sidebar">
        <Toggle label="Sidebar recents" checked={s.sidebarRecents} onChange={(v) => update({ sidebarRecents: v })} />
      </Row>
      {sections.map((x) => (
        <Row key={x.key} title={`Home: ${x.label}`}>
          <Toggle label={x.label} checked={s.homeSections[x.key]} onChange={(v) => update({ homeSections: { ...s.homeSections, [x.key]: v } })} />
        </Row>
      ))}
      <Heading>PandaClient</Heading>
      <Row title="Sync my PandaClient settings" text="Your HUD layout, mods on/off and in-game settings follow you to any PC you sign in on.">
        <Toggle label="Cloud sync" checked={s.cloudSync} onChange={(v) => update({ cloudSync: v })} />
      </Row>
      <Row title="Welcome setup" text="Go through the first-open setup again (folder, account, bundles, appearance).">
        <Button size="sm" onClick={() => update({ showSetup: true })}>
          Show it again
        </Button>
      </Row>
      <Row title="Show advanced settings" text="Java, JVM arguments and launch hooks. Most people never need these.">
        <Toggle label="Advanced" checked={s.showAdvanced} onChange={(v) => update({ showAdvanced: v })} />
      </Row>
      <Row title="Show snapshots" text="List snapshot versions when creating profiles.">
        <Toggle label="Snapshots" checked={s.showSnapshots} onChange={(v) => update({ showSnapshots: v })} />
      </Row>
    </>
  )
}

function Accounts() {
  const { accounts, setAccounts, signIn, attempt } = useStore()
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Heading sub="Sign in with the Microsoft account that owns Minecraft: Java Edition. Your password goes to Microsoft, never to PandaClient.">Minecraft accounts</Heading>
      <div className="mt-3 flex flex-col gap-2">
        {accounts.map((a) => (
          <div key={a.uuid} className={`flex items-center gap-3 rounded-xl border p-3 ${a.active ? 'border-mint/50 bg-mint/5' : 'border-border'}`}>
            <SkinHead account={a} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{a.username}</div>
              <div className="truncate font-mono text-[11px] text-muted">{a.uuid}</div>
            </div>
            {a.active ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-mint"><Check size={14} /> Playing as</span>
            ) : (
              <Button size="sm" onClick={async () => setAccounts((await attempt(() => api.auth.setActive(a.uuid))) ?? accounts)}>Use</Button>
            )}
            <Button size="sm" variant="ghost" onClick={async () => setAccounts((await attempt(() => api.auth.logout(a.uuid), `Signed out ${a.username}`)) ?? accounts)}>
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        ))}
        <Button
          variant={accounts.length ? 'secondary' : 'primary'}
          busy={busy}
          className="mt-1 self-start"
          onClick={async () => {
            setBusy(true)
            await signIn()
            setBusy(false)
          }}
        >
          {!busy && <MicrosoftMark />} {accounts.length ? 'Add another account' : 'Sign in with Microsoft'}
        </Button>
      </div>
    </>
  )
}

function Java({ s, update }: { s: Settings; update: (p: Partial<Settings>) => void }) {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [javas, setJavas] = useState<JavaInstall[] | null>(null)
  const [detecting, setDetecting] = useState(false)
  useEffect(() => {
    api.system.info().then(setInfo)
  }, [])
  const maxRam = Math.max(2048, Math.floor(((info?.totalMemMb ?? 8192) - 2048) / 512) * 512)
  return (
    <>
      <Heading sub="Profiles use these unless you change them in a profile's own settings.">Memory</Heading>
      <Row title="Maximum RAM" text={info ? `${gb(info.totalMemMb)} installed. 4 GB suits most Fabric setups.` : undefined}>
        <Slider min={1024} max={maxRam} step={512} value={Math.min(s.ramMb, maxRam)} onChange={(v) => update({ ramMb: v })} format={gb} />
      </Row>
      {!s.showAdvanced && (
        <p className="mt-6 text-[13px] text-muted">
          PandaClient picks the right Java for you.{' '}
          <button className="font-medium text-blue hover:underline" onClick={() => update({ showAdvanced: true })}>
            Show advanced settings
          </button>
        </p>
      )}
      {s.showAdvanced && (<>
      <Heading sub="Leave empty and PandaClient downloads the exact Java each Minecraft version needs from Mojang.">Java</Heading>
      <div className="flex gap-2">
        <TextField value={s.javaPath} onChange={(v) => update({ javaPath: v })} placeholder="Automatic (recommended)" mono className="flex-1" />
        <Button
          onClick={async () => {
            setDetecting(true)
            setJavas(await api.system.detectJava().catch(() => []))
            setDetecting(false)
          }}
        >
          {detecting ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Detect
        </Button>
        <Button variant="ghost" onClick={async () => { const f = await api.settings.pickFile('java', s.javaPath || undefined); if (f) update({ javaPath: f }) }}>
          Browse
        </Button>
        {s.javaPath && (
          <Button variant="ghost" onClick={() => update({ javaPath: '' })} title="Back to automatic">
            <X size={15} />
          </Button>
        )}
      </div>
      {javas && (
        <div className="mt-3 flex flex-col gap-1.5">
          {javas.length === 0 && <p className="text-[13px] text-muted">No Java found. Automatic mode will download it.</p>}
          {javas.map((j) => (
            <button key={j.path} onClick={() => update({ javaPath: j.path })} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-raised ${s.javaPath === j.path ? 'border-mint/50' : 'border-border'}`}>
              <span className="rounded-md bg-blue/15 px-2 py-0.5 text-xs font-semibold text-blue">Java {j.major}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">{j.path}</span>
              {s.javaPath === j.path && <Check size={15} className="text-mint" />}
            </button>
          ))}
        </div>
      )}
      <Heading sub="Added to every launch. Example: -XX:+UseZGC">Extra JVM arguments</Heading>
      <TextField value={s.jvmArgs} onChange={(v) => update({ jvmArgs: v })} placeholder="None" mono className="w-full" />
      </>)}
    </>
  )
}

function WindowSection({ s, update }: { s: Settings; update: (p: Partial<Settings>) => void }) {
  const set = (p: Partial<Settings['window']>) => update({ window: { ...s.window, ...p } })
  return (
    <>
      <Heading sub="How the Minecraft window opens.">Game window</Heading>
      <Row title="Fullscreen" text="Updates the profile's options.txt before launch.">
        <Toggle label="Fullscreen" checked={s.window.fullscreen} onChange={(v) => set({ fullscreen: v })} />
      </Row>
      <Row title="Width" text="Window width in pixels when not fullscreen.">
        <input type="number" value={s.window.width} onChange={(e) => set({ width: Number(e.target.value) })} disabled={s.window.fullscreen} className="h-10 w-28 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-blue/60 disabled:opacity-40" />
      </Row>
      <Row title="Height">
        <input type="number" value={s.window.height} onChange={(e) => set({ height: Number(e.target.value) })} disabled={s.window.fullscreen} className="h-10 w-28 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-blue/60 disabled:opacity-40" />
      </Row>
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          [854, 480],
          [1280, 720],
          [1600, 900],
          [1920, 1080]
        ].map(([w, h]) => (
          <Button key={w} size="sm" variant={s.window.width === w && s.window.height === h ? 'blue' : 'ghost'} disabled={s.window.fullscreen} onClick={() => set({ width: w, height: h })}>
            {w}×{h}
          </Button>
        ))}
      </div>
    </>
  )
}

function Hooks({ s, update }: { s: Settings; update: (p: Partial<Settings>) => void }) {
  const set = (p: Partial<Settings['hooks']>) => update({ hooks: { ...s.hooks, ...p } })
  const fields: { key: keyof Settings['hooks']; title: string; text: string; placeholder: string }[] = [
    { key: 'preLaunch', title: 'Before launch', text: 'Runs and must finish before Minecraft starts.', placeholder: 'e.g. backup-worlds.bat' },
    { key: 'wrapper', title: 'Wrapper', text: 'Runs Minecraft through another program.', placeholder: 'e.g. prime-run or gamemoderun' },
    { key: 'postExit', title: 'After exit', text: 'Runs when Minecraft closes.', placeholder: 'e.g. sync-screenshots.sh' }
  ]
  return (
    <>
      <Heading sub="Advanced. Commands run in the profile folder with INST_NAME, INST_ID, INST_DIR, INST_MC_VERSION and INST_JAVA set.">Launch hooks</Heading>
      {fields.map((f) => (
        <div key={f.key} className="border-b border-border/60 py-4 last:border-0">
          <div className="text-sm font-semibold">{f.title}</div>
          <div className="mb-2 mt-0.5 text-[13px] text-muted">{f.text}</div>
          <TextField value={s.hooks[f.key]} onChange={(v) => set({ [f.key]: v })} placeholder={f.placeholder} mono className="w-full" />
        </div>
      ))}
    </>
  )
}

function Resources({ s, update }: { s: Settings; update: (p: Partial<Settings>) => void }) {
  const { attempt, toast } = useStore()
  return (
    <>
      <Heading sub="Profiles, versions, libraries and Java runtimes live here.">Game directory</Heading>
      <div className="flex gap-2">
        <TextField value={s.gameDir} onChange={(v) => update({ gameDir: v })} mono className="flex-1" />
        <Button onClick={async () => { const p = await api.settings.pickDirectory(s.gameDir); if (p) update({ gameDir: p }) }}>Change</Button>
        <Button variant="ghost" onClick={() => api.system.openPath(s.gameDir)}><FolderOpen size={15} /> Open</Button>
      </div>
      <Heading>Downloads</Heading>
      <Row title="Parallel downloads" text="Files downloaded at once when installing.">
        <Slider min={1} max={16} step={1} value={s.maxDownloads} onChange={(v) => update({ maxDownloads: v })} format={String} />
      </Row>
      <Row title="Clear caches" text="Forget cached version lists and Modrinth lookups. Your profiles aren't touched.">
        <Button onClick={async () => { const r = await attempt(() => api.system.clearCache()); if (r) toast(r, 'success') }}>Clear</Button>
      </Row>
    </>
  )
}

function UpdateBox() {
  const s = useUpdateState()
  const [checking, setChecking] = useState(false)
  if (!s) return null
  const text =
    s.status === 'unsupported'
      ? 'Updates work in the installed app.'
      : s.status === 'checking'
        ? 'Checking for updates…'
        : s.status === 'downloading'
          ? `Downloading ${s.version}… ${Math.round((s.progress ?? 0) * 100)}%`
          : s.status === 'ready'
            ? `Version ${s.version} is ready to install.`
            : s.status === 'error'
              ? `Couldn't check for updates (${s.error}).`
              : s.status === 'none'
                ? "You're on the latest version."
                : 'PandaClient checks for updates automatically.'
  return (
    <div className="mt-5 flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-bg/50 p-3 text-left">
      <RefreshCw size={18} className={`shrink-0 text-mint ${s.status === 'checking' || checking ? 'animate-spin' : ''}`} />
      <span className="flex-1 text-[13px]">{text}</span>
      {s.status === 'ready' ? (
        <Button size="sm" variant="primary" onClick={() => api.updater.install()}>Restart</Button>
      ) : (
        s.status !== 'unsupported' && (
          <Button size="sm" disabled={s.status === 'downloading'} onClick={async () => { setChecking(true); await api.updater.check(); setChecking(false) }}>
            Check now
          </Button>
        )
      )}
    </div>
  )
}

function About() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  useEffect(() => {
    api.system.info().then(setInfo)
  }, [])
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Logo size={88} />
      <h3 className="mt-4 text-xl font-bold">PandaClient</h3>
      <p className="mt-1 text-sm text-muted">Version {info?.appVersion ?? '…'} · {info?.platform ?? ''}</p>
      <p className="mt-4 max-w-sm text-[13px] text-muted">A simple, Fabric-only Minecraft launcher. Minecraft files are always downloaded from Mojang. Not affiliated with Mojang or Microsoft.</p>
      <UpdateBox />
      <div className="mt-5 flex gap-2">
        <Button onClick={() => api.system.openExternal('https://github.com/Baconrolls03/PandaClient')}><Code2 size={15} /> Source code</Button>
        <Button variant="ghost" onClick={() => api.system.openExternal('https://modrinth.com')}><Monitor size={15} /> Modrinth</Button>
      </div>
    </div>
  )
}

export function SettingsModal({ section: initial = 'appearance' }: { section?: SettingsSection }) {
  const { closeModal, settings, update } = useStore()
  const [section, setSection] = useState<SettingsSection>(initial)
  const [info, setInfo] = useState<SystemInfo | null>(null)
  useEffect(() => {
    api.system.info().then(setInfo)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeModal()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeModal])

  const body = {
    appearance: <Appearance s={settings} update={update} />,
    behavior: <Behavior s={settings} update={update} />,
    accounts: <Accounts />,
    java: <Java s={settings} update={update} />,
    window: <WindowSection s={settings} update={update} />,
    hooks: <Hooks s={settings} update={update} />,
    resources: <Resources s={settings} update={update} />,
    about: <About />
  }[section]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="flex h-[min(680px,88vh)] w-full max-w-5xl animate-pop overflow-hidden rounded-2xl border border-border bg-surface shadow-lift">
        <nav className="flex w-60 shrink-0 flex-col border-r border-border bg-bg/40">
          <h2 className="px-5 pb-2 pt-5 text-lg font-bold">Settings</h2>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {NAV.map((g) => (
              <div key={g.group} className="mt-3">
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.group}</div>
                {g.items.filter((i) => i.id !== 'hooks' || settings.showAdvanced).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSection(id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${section === id ? 'bg-mint text-ink' : 'text-muted hover:bg-raised hover:text-text'}`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2.5 border-t border-border px-4 py-3">
            <Logo size={26} />
            <div className="text-[11px] leading-tight text-muted">
              PandaClient {info?.appVersion}
              <br />
              {info?.platform === 'win32' ? 'Windows' : info?.platform === 'darwin' ? 'macOS' : info?.platform}
            </div>
          </div>
        </nav>
        <div className="relative min-w-0 flex-1 overflow-y-auto px-8 py-6">
          <button aria-label="Close settings" onClick={closeModal} className="absolute right-4 top-4 grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-text">
            <X size={18} />
          </button>
          <div key={section} className="animate-pop">{body}</div>
        </div>
      </div>
    </div>
  )
}
