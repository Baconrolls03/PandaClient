import logoUrl from '@assets/logo.svg'

export function Logo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <img src={logoUrl} width={size} height={size} alt="" draggable={false} className={className} />
}
