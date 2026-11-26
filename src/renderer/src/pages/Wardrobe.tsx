import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, Flag, Globe, ImageUp, RotateCcw, Shirt, Sparkles, Users } from 'lucide-react'
import { COSMETIC_CATEGORIES, type Cosmetic, type CosmeticCategory, type Loadout, type MojangProfile } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { errorMessage } from '@/lib/format'
import { cosmeticThumbnail } from '@/lib/cosmetics'
import { SkinPreview } from '@/components/SkinPreview'
import { MicrosoftMark } from '@/components/AccountCard'
import { Button, Empty, SearchField, Spinner } from '@/components/ui'

type Tab = 'cosmetics' | 'skin' | 'capes'

const RARITY: Record<Cosmetic['rarity'], { label: string; text: string; ring: string }> = {
  common: { label: 'Common', text: 'text-muted', ring: 'ring-border' },
  rare: { label: 'Rare', text: 'text-blue', ring: 'ring-blue/40' },
  epic: { label: 'Epic', text: 'text-[#B38CFF]', ring: 'ring-[#B38CFF]/40' },
  legendary: { label: 'Legendary', text: 'text-[#F5C542]', ring: 'ring-[#F5C542]/50' }
}

const sameLoadout = (a: Loadout, b: Loadout) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())

function TabCard({ active, onClick, icon, title, text }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-px ${
        active ? 'border-mint/50 bg-mint/8 shadow-soft' : 'border-border bg-surface hover:bg-raised'
      }`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-mint text-ink' : 'bg-raised text-muted'}`}>{icon}</span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{text}</span>
      </span>
    </button>
  )
}

/** Crop the outer face of a Mojang cape texture for a thumbnail. */
function useCapeFace(src: string | null): string | null {
  const [out, setOut] = useState<string | null>(null)
  useEffect(() => {
    if (!src) return setOut(null)
    const img = new Image()
    img.onload = () => {
      const s = img.width / 64
      const c = document.createElement('canvas')
      c.width = 80
      c.height = 128
      const ctx = c.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 1 * s, 1 * s, 10 * s, 16 * s, 0, 0, 80, 128)
      setOut(c.toDataURL())
    }
    img.src = src
  }, [src])
  return out
}

function MojangCapeCard({ cape, active, onClick, busy }: { cape: MojangProfile['capes'][number] | null; active: boolean; onClick: () => void; busy: boolean }) {
  const face = useCapeFace(cape?.image ?? null)
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:bg-raised ${active ? 'border-mint/60 bg-mint/5' : 'border-border bg-surface'}`}
    >
      <div className="grid h-32 w-20 place-items-center overflow-hidden rounded-lg bg-bg">
        {cape ? face ? <img src={face} alt="" className="h-32 w-20 [image-rendering:pixelated]" /> : <Spinner /> : <span className="text-xs text-muted">None</span>}
      </div>
      <span className="text-sm font-semibold">{cape?.alias ?? 'No cape'}</span>
      {active ? <span className="flex items-center gap-1 text-xs font-semibold text-mint"><Check size={13} /> Equipped</span> : <span className="text-xs text-muted">{busy ? 'Saving…' : 'Equip'}</span>}
    </button>
  )
}

export function Wardrobe() {
  const { activeAccount, signIn, attempt } = useStore()
  const [tab, setTab] = useState<Tab>('cosmetics')
  const [catalog, setCatalog] = useState<Cosmetic[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Loadout>({})
  const [draft, setDraft] = useState<Loadout>({})
  const [category, setCategory] = useState<CosmeticCategory | 'all'>('all')
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<MojangProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [pendingSkin, setPendingSkin] = useState<{ file: string; image: string; slim: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api.wardrobe.catalog().then(setCatalog).catch((e) => setCatalogError(errorMessage(e)))
  }, [])
  useEffect(() => {
    setProfile(null)
    setProfileError(null)
    if (!activeAccount) return
    api.wardrobe.loadout().then((l) => (setSaved(l), setDraft(l))).catch(() => {})
    api.wardrobe.profile().then(setProfile).catch((e) => setProfileError(errorMessage(e)))
  }, [activeAccount])

  const byId = useMemo(() => new Map((catalog ?? []).map((c) => [c.id, c])), [catalog])
  const equipped = useMemo(() => Object.values(draft).map((id) => byId.get(id!)).filter(Boolean) as Cosmetic[], [draft, byId])
  const thumbs = useMemo(() => new Map((catalog ?? []).map((c) => [c.id, cosmeticThumbnail(c)])), [catalog])
  const shown = (catalog ?? []).filter((c) => (category === 'all' || c.category === category) && c.name.toLowerCase().includes(q.toLowerCase()))
  const dirty = !sameLoadout(draft, saved)
  const activeCape = profile?.capes.find((c) => c.state === 'ACTIVE') ?? null

  const toggle = (c: Cosmetic) =>
    setDraft((d) => {
      const next = { ...d }
      if (next[c.category] === c.id) delete next[c.category]
      else next[c.category] = c.id
      return next
    })

  async function save() {
    if (!activeAccount) return void signIn()
    setSaving(true)
    const l = await attempt(() => api.wardrobe.saveLoadout(draft), 'Loadout saved. Other PandaClient players will see it.')
    setSaving(false)
    if (l) {
      setSaved(l)
      setDraft(l)
    }
  }

  async function pickSkin() {
    const file = await api.settings.pickFile('skin')
    if (!file) return
    const image = await attempt(() => api.wardrobe.readImage(file))
    if (image) setPendingSkin({ file, image, slim: false })
  }

  async function applySkin() {
    if (!pendingSkin) return
    setBusy('skin')
    const p = await attempt(() => api.wardrobe.uploadSkin(pendingSkin.file, pendingSkin.slim ? 'slim' : 'classic'), 'Skin changed. Everyone will see it in game.')
    setBusy(null)
    if (p) {
      setProfile(p)
      setPendingSkin(null)
    }
  }

  async function equipCape(id: string | null) {
    setBusy(id ?? 'none')
    const p = await attempt(() => api.wardrobe.setCape(id), id ? 'Cape equipped' : 'Cape hidden')
    setBusy(null)
    if (p) setProfile(p)
  }

  const previewSkin = pendingSkin?.image ?? profile?.skin?.image ?? null
  const previewSlim = pendingSkin ? pendingSkin.slim : profile?.skin?.variant === 'SLIM'

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[1fr_340px] gap-6 p-8">
      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wardrobe</h1>
          <p className="mt-1 text-sm text-muted">Dress up your character. Skins and Mojang capes show for everyone; PandaClient cosmetics show for everyone using PandaClient.</p>
        </div>

        <div className="flex gap-3">
          <TabCard active={tab === 'cosmetics'} onClick={() => setTab('cosmetics')} icon={<Sparkles size={18} />} title="Cosmetics" text="Hats, capes, wings and more" />
          <TabCard active={tab === 'skin'} onClick={() => setTab('skin')} icon={<Shirt size={18} />} title="Skin" text="Upload and switch your skin" />
          <TabCard active={tab === 'capes'} onClick={() => setTab('capes')} icon={<Flag size={18} />} title="Mojang capes" text="Capes you own from Minecraft" />
        </div>

        {tab === 'cosmetics' && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-1.5">
              {[{ id: 'all' as const, name: 'All' }, ...COSMETIC_CATEGORIES].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all ${category === c.id ? 'bg-mint text-ink shadow-mint' : 'text-muted hover:text-text'}`}
                >
                  {c.name}
                  {c.id !== 'all' && draft[c.id] && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />}
                </button>
              ))}
            </div>
            <SearchField value={q} onChange={setQ} placeholder="Search cosmetics" />
            {catalogError ? (
              <Empty icon={<Sparkles size={22} />} title="Couldn't load cosmetics">{catalogError}</Empty>
            ) : !catalog ? (
              <div className="grid place-items-center py-16"><Spinner /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {shown.map((c) => {
                  const on = draft[c.category] === c.id
                  const r = RARITY[c.rarity]
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c)}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lift ${on ? 'border-mint/60 bg-mint/5' : 'border-border bg-surface hover:bg-raised'}`}
                    >
                      <div className={`relative grid h-36 place-items-center bg-[radial-gradient(circle_at_50%_60%,var(--color-raised),transparent_70%)]`}>
                        <img src={thumbs.get(c.id)} alt="" className={`max-h-28 [image-rendering:pixelated] transition-transform duration-200 group-hover:scale-105 ${c.category === 'cape' ? 'h-28 rounded-md shadow-soft' : ''}`} />
                        {on && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-mint text-ink"><Check size={14} /></span>}
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{c.name}</div>
                          <div className={`text-[11px] font-semibold ${r.text}`}>{r.label}</div>
                        </div>
                        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${on ? 'bg-mint text-ink' : 'bg-raised text-muted group-hover:text-text'}`}>{on ? 'On' : 'Equip'}</span>
                      </div>
                    </button>
                  )
                })}
                {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted">Nothing matches.</p>}
              </div>
            )}
          </>
        )}

        {tab !== 'cosmetics' && !activeAccount && (
          <Empty icon={<Users size={22} />} title="Sign in to change your skin and capes" action={<Button variant="primary" onClick={() => void signIn()}><MicrosoftMark /> Sign in with Microsoft</Button>}>
            These are your real Minecraft skin and capes, saved on your Microsoft account.
          </Empty>
        )}

        {tab === 'skin' && activeAccount && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-2xl border border-blue/30 bg-blue/5 px-4 py-3 text-sm">
              <Globe size={16} className="text-blue" /> Your skin is saved to your Minecraft account, so every player on every server sees it.
            </div>
            {profileError && <p className="text-sm text-danger">{profileError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <h3 className="text-sm font-semibold">Current skin</h3>
                <p className="mt-1 text-xs text-muted">{profile ? `${profile.skin?.variant === 'SLIM' ? 'Slim (Alex)' : 'Classic (Steve)'} arms` : 'Loading…'}</p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={pickSkin}><ImageUp size={15} /> Upload new skin</Button>
                  <Button
                    variant="ghost"
                    busy={busy === 'reset'}
                    onClick={async () => {
                      setBusy('reset')
                      const p = await attempt(() => api.wardrobe.resetSkin(), 'Skin reset to default')
                      setBusy(null)
                      if (p) setProfile(p)
                    }}
                  >
                    <RotateCcw size={15} /> Reset
                  </Button>
                </div>
              </div>
              {pendingSkin && (
                <div className="animate-pop rounded-2xl border border-mint/40 bg-mint/5 p-5 shadow-soft">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><Eye size={15} /> Previewing new skin</h3>
                  <p className="mt-1 truncate text-xs text-muted">{pendingSkin.file.split(/[\\/]/).pop()}</p>
                  <div className="mt-3 flex gap-1 rounded-xl border border-border bg-bg p-1 text-xs font-semibold">
                    {(['Classic', 'Slim'] as const).map((v) => (
                      <button key={v} onClick={() => setPendingSkin({ ...pendingSkin, slim: v === 'Slim' })} className={`flex-1 rounded-lg py-1.5 ${pendingSkin.slim === (v === 'Slim') ? 'bg-raised text-text' : 'text-muted'}`}>
                        {v} arms
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="primary" busy={busy === 'skin'} onClick={applySkin}>Apply skin</Button>
                    <Button variant="ghost" onClick={() => setPendingSkin(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'capes' && activeAccount && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-2xl border border-blue/30 bg-blue/5 px-4 py-3 text-sm">
              <Globe size={16} className="text-blue" /> Official capes from Minecraft (events, Minecon, purchases). Everyone sees the one you equip. A PandaClient cape from Cosmetics shows on top for PandaClient players.
            </div>
            {profileError && <p className="text-sm text-danger">{profileError}</p>}
            {!profile ? (
              !profileError && <Spinner />
            ) : profile.capes.length === 0 ? (
              <Empty icon={<Flag size={22} />} title="No Mojang capes on this account">Capes come from Minecraft events and purchases. Try a PandaClient cape in Cosmetics instead.</Empty>
            ) : (
              <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-5">
                <MojangCapeCard cape={null} active={!activeCape} busy={busy === 'none'} onClick={() => equipCape(null)} />
                {profile.capes.map((c) => (
                  <MojangCapeCard key={c.id} cape={c} active={c.state === 'ACTIVE'} busy={busy === c.id} onClick={() => equipCape(c.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <aside className="sticky top-0 flex max-h-[calc(100vh-11rem)] flex-col self-start rounded-2xl border border-border bg-surface shadow-soft">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-bold">{activeAccount?.username ?? 'Preview'}</span>
          <span className="text-xs text-muted">{equipped.length} equipped</span>
        </header>
        <div className="bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--color-mint)_12%,transparent),transparent_65%)]">
          <SkinPreview skin={previewSkin} slim={previewSlim} cosmetics={equipped} mojangCape={activeCape?.image ?? null} />
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3">
          {equipped.length === 0 && <span className="text-xs text-muted">Nothing equipped yet.</span>}
          {equipped.map((c) => (
            <button key={c.id} onClick={() => toggle(c)} className="rounded-lg bg-raised px-2 py-1 text-xs font-medium text-muted hover:text-danger" title="Unequip">
              {c.name} ×
            </button>
          ))}
        </div>
        <footer className="flex gap-2 border-t border-border p-4">
          <Button variant="ghost" className="flex-1" disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
          <Button variant="primary" className="flex-1" busy={saving} disabled={!dirty && Boolean(activeAccount)} onClick={save}>
            {!saving && (activeAccount ? <Check size={16} /> : <MicrosoftMark />)} {activeAccount ? 'Save loadout' : 'Sign in'}
          </Button>
        </footer>
        {!activeAccount && <p className="px-4 pb-3 text-center text-[11px] text-muted">You can try things on now; sign in to wear them in game.</p>}
      </aside>
    </div>
  )
}
