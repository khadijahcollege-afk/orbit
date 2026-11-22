import { cn } from '@/lib/utils'

/** Logo ORBIT: planet + cincin orbit + satelit kecil. */
export function OrbitMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="orb-g" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(258 88% 72%)" />
          <stop offset="1" stopColor="hsl(258 88% 55%)" />
        </linearGradient>
        <linearGradient id="orb-ring" x1="2" y1="24" x2="46" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(188 88% 56%)" />
          <stop offset="0.5" stopColor="hsl(258 88% 67%)" />
          <stop offset="1" stopColor="hsl(304 76% 64%)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="9.5" fill="url(#orb-g)" />
      <circle cx="20.5" cy="20.5" r="3" fill="hsl(0 0% 100% / 0.35)" />
      <ellipse
        cx="24"
        cy="24"
        rx="20"
        ry="8"
        stroke="url(#orb-ring)"
        strokeWidth="2.4"
        transform="rotate(-24 24 24)"
        strokeLinecap="round"
        strokeDasharray="96 14"
      />
      <circle cx="41.2" cy="13.6" r="2.6" fill="hsl(188 88% 60%)" />
    </svg>
  )
}

export function Logo({
  size = 28,
  className,
  wordmarkClassName,
}: {
  size?: number
  className?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <OrbitMark size={size} />
      <span
        className={cn(
          'font-display font-bold tracking-[0.22em] leading-none select-none',
          wordmarkClassName,
        )}
        style={{ fontSize: size * 0.62 }}
      >
        ORBIT
      </span>
    </span>
  )
}
