import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
  className?: string
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = buildPageNumbers(page, totalPages)

  const from = pageSize ? page * pageSize + 1 : undefined
  const to = pageSize && totalItems ? Math.min((page + 1) * pageSize, totalItems) : undefined

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {/* Info text */}
      <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
        {totalItems !== undefined && from !== undefined && to !== undefined
          ? `${from}–${to} sur ${totalItems}`
          : `Page ${page + 1} sur ${totalPages}`}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          aria-label="Première page"
          className="pagination-btn"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Prev */}
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Page précédente"
          className="pagination-btn"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-0.5 mx-1">
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-[var(--sea-ink-soft)] select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`h-8 min-w-[2rem] rounded-lg text-xs font-semibold transition-all ${
                  page === p
                    ? 'bg-[var(--lagoon)] text-white shadow-sm scale-105'
                    : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]'
                }`}
              >
                {(p as number) + 1}
              </button>
            ),
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          aria-label="Page suivante"
          className="pagination-btn"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
          aria-label="Dernière page"
          className="pagination-btn"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i)
  }

  const pages: (number | '...')[] = [0]

  if (current > 2) pages.push('...')

  const start = Math.max(1, current - 1)
  const end = Math.min(total - 2, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 3) pages.push('...')

  pages.push(total - 1)

  return pages
}
