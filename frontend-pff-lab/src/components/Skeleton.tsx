/**
 * Shared skeleton loading placeholder with shimmer animation.
 */
export function SkeletonLine({
  className = '',
  width = 'w-full',
}: {
  className?: string
  width?: string
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--line)] ${width} h-4 ${className}`}
    />
  )
}

export function SkeletonBlock({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? 'w-3/5' : 'w-full'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-[var(--line)] bg-white/40 p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <SkeletonLine width="w-32" />
        <SkeletonLine width="w-16" />
      </div>
      <SkeletonLine width="w-4/5" className="mt-3" />
      <SkeletonLine width="w-1/3" className="mt-2" />
    </div>
  )
}
