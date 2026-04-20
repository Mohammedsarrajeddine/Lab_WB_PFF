/**
 * Shared animated spinner component.
 */
export default function Spinner({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const px = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'

  return (
    <svg
      className={`animate-spin ${px} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="62.83"
        strokeDashoffset="20"
        strokeLinecap="round"
        className="opacity-30"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="62.83"
        strokeDashoffset="48"
        strokeLinecap="round"
      />
    </svg>
  )
}
