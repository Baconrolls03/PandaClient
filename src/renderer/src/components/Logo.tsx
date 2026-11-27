import logoUrl from '@/assets/panda-logo.png'

/** PandaClient's panda logo. */
export function Logo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <img src={logoUrl} width={size} height={size} alt="" draggable={false} className={`select-none ${className}`} />
}
