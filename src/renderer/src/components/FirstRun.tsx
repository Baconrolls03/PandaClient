import { useEffect, useState } from 'react'
import { ArrowRight, Check, FileUp, LogIn } from 'lucide-react'
import { BUNDLES, PANDA_VERSIONS, type BundleId } from '@shared/bundles'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui'
import { BundlePicker } from '@/modals/CreateInstanceModal'

/** First start: sign in, pick a version and a play style, and PandaClient sets up your first profile. */
export function FirstRun() {
  const { settings, update, instances, activeAccount, signIn, attempt, openModal, toast } = useStore()
  const [step, setStep] = useState(0)
  const [mc, setMc] = useState(PANDA_VERSIONS[0])
  const [bundle, setBundle] = useState<BundleId>('pvp')
  const [busy, setBusy] = useState(false)
  const [existing, setExisting] = useState<number | null>(null)
  useEffect(() => {
    api.instances.list().then((l) => setExisting(l.length)).catch(() => setExisting(0))
  }, [])
  // People who already have profiles never see it.
  useEffect(() => {
    if (!settings.onboarded && (instances.length > 0 || (existing ?? 0) > 0)) update({ onboarded: true })
  }, [settings.onboarded, instances.length, existing, update])
  if (settings.onboarded || existing == null || existing > 0 || instances.length > 0) return null

  const finish = async () => {
    setBusy(true)
    const b = BUNDLES.find((x) => x.id === bundle)!
    const inst = await attempt(() => api.instances.create({ name: `${b.id === 'none' ? 'PandaClient' : b.name} ${mc}`, mcVersion: mc, loaderVersion: null, bundle }))
    setBusy(false)
    if (inst) {
      update({ onboarded: true, selectedInstance: inst.id })
      toast(`${inst.name} is ready. Mods are downloading in the background.`, 'success')
    }
  }
  const dots = (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-mint' : 'w-1.5 bg-border'}`} />
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 grid animate-pop place-items-center bg-bg/95 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-mint/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-blue/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-xl rounded-3xl border border-border bg-surface p-8 shadow-lift">
        {step === 0 && (
          <>
            <Logo size={56} />
            <h1 className="mt-5 text-3xl font-bold tracking-tight">Welcome to PandaClient</h1>
            <p className="mt-2 text-sm text-muted">Three quick steps and you're playing. First, sign in with the Microsoft account you play Minecraft on.</p>
            <div className="mt-6 rounded-2xl border border-border bg-bg p-4">
              {activeAccount ? (
                <p className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-mint" /> Signed in as <b>{activeAccount.username}</b>
                </p>
              ) : (
                <Button variant="primary" onClick={() => signIn()}>
                  <LogIn size={16} /> Sign in with Microsoft
                </Button>
              )}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Pick a Minecraft version</h1>
            <p className="mt-2 text-sm text-muted">The newest is best for most servers. You can add other versions any time.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {PANDA_VERSIONS.map((v, i) => (
                <button
                  key={v}
                  onClick={() => setMc(v)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${mc === v ? 'border-mint/60 bg-mint/10' : 'border-border bg-bg hover:bg-raised'}`}
                >
                  <span className="block text-lg font-bold">{v}</span>
                  <span className="block text-xs text-muted">{i === 0 ? 'Newest (recommended)' : 'Fabric'}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">How do you play?</h1>
            <p className="mt-2 text-sm text-muted">We'll add a tested set of mods for it, on top of PandaClient and its built-in performance mods.</p>
            <div className="mt-6">
              <BundlePicker value={bundle} onChange={setBundle} />
            </div>
          </>
        )}
        <div className="mt-8 flex items-center gap-3">
          {dots}
          <div className="ml-auto flex items-center gap-2">
            {step === 0 && (
              <Button variant="ghost" onClick={() => (update({ onboarded: true }), openModal({ kind: 'import' }))}>
                <FileUp size={15} /> Import from another launcher
              </Button>
            )}
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 2 ? (
              <Button variant="primary" disabled={step === 0 && !activeAccount} onClick={() => setStep(step + 1)}>
                Next <ArrowRight size={15} />
              </Button>
            ) : (
              <Button variant="primary" busy={busy} onClick={finish}>
                Set it up <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </div>
        <button onClick={() => update({ onboarded: true })} className="absolute right-5 top-5 text-xs text-muted hover:text-text">
          Skip
        </button>
      </div>
    </div>
  )
}
