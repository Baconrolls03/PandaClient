import { useEffect, useState } from 'react'
import { ArrowRight, Check, Folder, FolderDown, HardDrive, LogIn, UserRound } from 'lucide-react'
import { BUNDLES, PANDA_VERSIONS, type BundleId } from '@shared/bundles'
import type { ThemeId } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Logo } from '@/components/Logo'
import { SkinHead } from '@/components/AccountCard'
import { Button, Select, Toggle } from '@/components/ui'

const STEPS = ['welcome', 'folder', 'account', 'bundles', 'appearance'] as const

/** Big, soft illustration tiles (like the ones in OneClient's setup). */
function Illustration({ step }: { step: (typeof STEPS)[number] }) {
  if (step === 'folder')
    return (
      <div className="relative size-36">
        <div className="absolute inset-0 grid place-items-center rounded-[2rem] bg-gradient-to-br from-[#5b7cff] to-[#3a3fd6] shadow-[0_30px_60px_-20px_#3a3fd6]">
          <Folder size={68} className="text-white/90" strokeWidth={1.6} />
        </div>
        <div className="absolute -right-4 -top-4 grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#ff7a9a] to-[#e0457b] shadow-lg">
          <FolderDown size={24} className="text-white" />
        </div>
      </div>
    )
  if (step === 'account')
    return (
      <div className="relative size-36">
        <div className="absolute inset-0 grid place-items-center rounded-[2rem] bg-gradient-to-br from-[#6d8bff] to-[#4152e0] shadow-[0_30px_60px_-20px_#4152e0]">
          <UserRound size={64} className="text-white/90" strokeWidth={1.6} />
        </div>
        <div className="absolute -bottom-4 -right-6 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#ff7a9a] to-[#e0457b] shadow-lg">
          <LogIn size={26} className="text-white" />
        </div>
      </div>
    )
  // appearance: a fan of colour swatches
  return (
    <div className="relative h-40 w-36">
      {['#3a3fd6', '#5b6cff', '#8a7bff', '#c86bd8', '#ff7a9a'].map((c, i) => (
        <div
          key={c}
          className="absolute bottom-0 left-6 h-36 w-20 origin-bottom-left rounded-2xl shadow-lg"
          style={{ background: c, transform: `rotate(${-28 + i * 14}deg)` }}
        />
      ))}
      <div className="absolute bottom-0 left-6 h-36 w-20 origin-bottom-left rounded-2xl bg-white/95 shadow-lg" style={{ transform: 'rotate(42deg)' }} />
    </div>
  )
}

/** First open: a full-screen, step-by-step setup that ends with a ready profile. */
export function FirstRun() {
  const { settings, update, instances, activeAccount, signIn, attempt, toast } = useStore()
  const [step, setStep] = useState(0)
  const [mc, setMc] = useState(PANDA_VERSIONS[0])
  const [bundles, setBundles] = useState<BundleId[]>(['pvp', 'performance'])
  const [busy, setBusy] = useState(false)
  const [existing, setExisting] = useState<number | null>(null)
  const [signing, setSigning] = useState(false)
  useEffect(() => {
    api.instances.list().then((l) => setExisting(l.length)).catch(() => setExisting(0))
  }, [])
  // People who already have profiles skip it (Settings → Behavior can show it again).
  useEffect(() => {
    if (!settings.onboarded && ((existing ?? 0) > 0 || instances.length > 0) && !settings.showSetup) update({ onboarded: true })
  }, [settings.onboarded, settings.showSetup, instances.length, existing, update])
  if (existing == null) return null
  if (settings.onboarded && !settings.showSetup) return null
  if (!settings.showSetup && (existing > 0 || instances.length > 0)) return null

  const id = STEPS[step]
  const finish = async () => {
    setBusy(true)
    const chosen = BUNDLES.filter((b) => bundles.includes(b.id))
    const name = chosen.length === 1 && chosen[0].id !== 'none' ? `${chosen[0].name} ${mc}` : `PandaClient ${mc}`
    const inst = await attempt(() => api.instances.create({ name, mcVersion: mc, loaderVersion: null, bundles: bundles.length ? bundles : ['none'] }))
    setBusy(false)
    if (inst) {
      update({ onboarded: true, showSetup: false, selectedInstance: inst.id })
      toast(`${inst.name} is ready. Mods are downloading in the background.`, 'success')
    }
  }
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish())
  const canNext = id !== 'account' || Boolean(activeAccount)
  const toggleBundle = (b: BundleId) =>
    setBundles((l) => (b === 'none' ? ['none'] : l.includes(b) ? l.filter((x) => x !== b) : [...l.filter((x) => x !== 'none'), b]))

  return (
    <div className="fixed inset-0 z-[60] flex animate-fade flex-col bg-bg">
      <div className="drag h-1 w-full bg-transparent">
        <div className="h-full bg-blue transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <header className="drag flex h-14 items-center justify-between px-6">
        {step > 0 ? (
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="text-[15px] font-extrabold tracking-[0.14em]">PANDACLIENT</span>
          </div>
        ) : (
          <span />
        )}
        <button onClick={() => update({ onboarded: true, showSetup: false })} className="no-drag text-xs text-muted hover:text-text">
          Skip setup
        </button>
      </header>

      <div key={id} className="flex flex-1 animate-rise items-center justify-center overflow-y-auto px-10">
        {id === 'welcome' && (
          <div className="text-center">
            <Logo size={64} className="mx-auto" />
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight">Welcome to PandaClient</h1>
            <p className="mt-3 text-muted">Let's get you set up. It only takes a minute.</p>
          </div>
        )}

        {id === 'folder' && (
          <div className="grid w-full max-w-4xl grid-cols-[220px_1fr] items-center gap-12">
            <div className="grid place-items-center">
              <Illustration step="folder" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Where should PandaClient live?</h1>
              <p className="mt-2 text-sm text-muted">All your data, including mods, worlds and game settings, goes here. You can change it later in Settings.</p>
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-blue bg-blue/10 p-4">
                  <HardDrive size={20} className="shrink-0 text-blue" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">This PC</div>
                    <div className="truncate font-mono text-xs text-muted">{settings.gameDir}</div>
                  </div>
                  <Check size={18} className="text-blue" />
                </div>
                <button
                  onClick={async () => {
                    const dir = await api.settings.pickDirectory(settings.gameDir)
                    if (dir) update({ gameDir: dir })
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:bg-raised"
                >
                  <Folder size={20} className="shrink-0 text-muted" />
                  <div>
                    <div className="text-sm font-semibold">Another drive or folder</div>
                    <div className="text-xs text-muted">Click to pick a folder</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {id === 'account' && (
          <div className="grid w-full max-w-4xl grid-cols-[220px_1fr] items-center gap-12">
            <div className="grid place-items-center">
              <Illustration step="account" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Account</h1>
              <p className="mt-2 text-sm text-muted">Before you continue, sign in with the Microsoft account that owns Minecraft: Java Edition. Your password goes to Microsoft, never to PandaClient.</p>
              <div className="mt-6">
                {activeAccount ? (
                  <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                    <SkinHead account={activeAccount} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{activeAccount.username}</div>
                      <div className="text-xs text-mint">Account added</div>
                    </div>
                    <Check size={18} className="text-mint" />
                  </div>
                ) : (
                  <Button variant="blue" busy={signing} onClick={async () => (setSigning(true), await signIn(), setSigning(false))}>
                    {!signing && <LogIn size={16} />} Add account
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {id === 'bundles' && (
          <div className="w-full max-w-5xl">
            <div className="flex items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Bundles</h1>
                <p className="mt-2 text-sm text-muted">Pick the mods you want. You can tick more than one, and change them any time.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                Minecraft
                <Select value={mc} onChange={setMc} className="w-44" options={PANDA_VERSIONS.map((v, i) => ({ value: v, label: i === 0 ? `${v} (newest)` : v }))} />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {BUNDLES.map((b) => {
                const on = bundles.includes(b.id)
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleBundle(b.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${on ? 'border-blue bg-blue/10' : 'border-border bg-surface hover:bg-raised'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`grid size-5 place-items-center rounded-md border ${on ? 'border-blue bg-blue text-white' : 'border-border-strong'}`}>{on && <Check size={13} />}</span>
                      <span className="font-semibold">{b.name}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{b.description}</p>
                    <p className="mt-2 text-[11px] text-muted/70">{b.mods.filter((m) => m !== 'fabric-api').length || 'No'} extra mods</p>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-muted">Every profile also gets PandaClient and its built-in performance mods (Sodium, Lithium and more).</p>
          </div>
        )}

        {id === 'appearance' && (
          <div className="grid w-full max-w-4xl grid-cols-[220px_1fr] items-center gap-12">
            <div className="grid place-items-center">
              <Illustration step="appearance" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Appearance</h1>
              <p className="mt-2 text-sm text-muted">Choose how PandaClient looks. You can change this later in Settings.</p>
              <div className="mt-6 text-xs font-semibold text-muted">Theme</div>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
                {(
                  [
                    ['light', 'Light'],
                    ['default', 'Dark'],
                    ['system', 'System']
                  ] as [ThemeId, string][]
                ).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => update({ theme: t })}
                    className={`rounded-lg py-2 text-sm font-semibold transition-colors ${settings.theme === t || (t === 'default' && settings.theme === 'oled') ? 'bg-blue text-white' : 'text-muted hover:text-text'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-6 text-xs font-semibold text-muted">Motion</div>
              <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface">
                <div className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-sm font-semibold">Animations</div>
                    <div className="text-xs text-muted">Smooth transitions between screens</div>
                  </div>
                  <Toggle label="Animations" checked={!settings.reduceMotion} onChange={(v) => update({ reduceMotion: !v })} />
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-sm font-semibold">Moving background</div>
                    <div className="text-xs text-muted">The lobby picture drifts and follows your mouse</div>
                  </div>
                  <Toggle label="Moving background" checked={!settings.reduceMotion} onChange={(v) => update({ reduceMotion: !v })} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between px-6 pb-5">
        <span className="text-[11px] text-muted/70">© {new Date().getFullYear()} PandaClient. Not affiliated with Mojang or Microsoft.</span>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button variant="blue" busy={busy} disabled={!canNext} onClick={next}>
            {step === STEPS.length - 1 ? 'Finish' : 'Next'} {!busy && <ArrowRight size={15} />}
          </Button>
        </div>
      </footer>
    </div>
  )
}
