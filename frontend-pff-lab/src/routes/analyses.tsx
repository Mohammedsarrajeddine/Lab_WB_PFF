import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { fetchCatalog, getApiErrorMessage } from '../lib/api'
import type { CatalogItem } from '../lib/api'
import PageHeader from '../components/layout/PageHeader'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import { Search, FlaskConical, Tag, ChevronDown, ChevronUp, X } from 'lucide-react'

export const Route = createFileRoute('/analyses')({
  component: AnalysesPage,
})

const PAGE_SIZE = 25

function AnalysesPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetchCatalog(controller.signal)
      .then((data) => setItems(data))
      .catch((e) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(e))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.synonyms.some((s) => s.toLowerCase().includes(q)),
    )
  }, [search, items])

  useEffect(() => { setPage(0) }, [search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
      <PageHeader
        kicker="Catalogue"
        title="Analyses médicales"
        subtitle={`${items.length} analyse(s) dans le catalogue`}
      />

      <div className="content-padding space-y-4">
        {/* Search toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] px-4 py-2.5 w-full max-w-md shadow-sm focus-within:border-[var(--lagoon)]/50 focus-within:shadow-md transition-all">
            <Search size={16} className="text-[var(--sea-ink-soft)] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code, nom ou synonyme…"
              className="flex-1 bg-transparent text-sm outline-none text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
          {search && (
            <span className="rounded-full bg-[var(--lagoon)]/10 px-3 py-1 text-xs font-semibold text-[var(--lagoon)]">
              {filtered.length} résultat(s)
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="island-shell p-12 text-center">
            <FlaskConical size={48} className="mx-auto mb-4 text-[var(--sea-ink-soft)] opacity-40" />
            <p className="m-0 text-base font-semibold text-[var(--sea-ink)]">Aucune analyse trouvée</p>
            <p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">Essayez un autre terme de recherche.</p>
          </div>
        ) : (
          <>
            {/* Premium Table */}
            <div className="island-shell overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[var(--line-strong)]">
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--sea-ink-soft)] bg-[var(--bg-base)]">
                        Code
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--sea-ink-soft)] bg-[var(--bg-base)] w-[35%]">
                        Analyse
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--sea-ink-soft)] bg-[var(--bg-base)] text-center w-24">
                        Coeff.
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--sea-ink-soft)] bg-[var(--bg-base)]">
                        Synonymes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((item, idx) => {
                      const isExpanded = expandedId === item.id
                      const isEven = idx % 2 === 0
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-[var(--line)] transition-colors hover:bg-[var(--lagoon)]/[0.04] ${isEven ? '' : 'bg-[var(--bg-base)]/50'}`}
                        >
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--lagoon)]/8 px-2.5 py-1 text-xs font-bold text-[var(--lagoon)] font-mono tracking-wide">
                              <FlaskConical size={12} className="opacity-60" />
                              {item.code}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="m-0 text-[13px] font-semibold text-[var(--sea-ink)] leading-snug">
                              {item.name}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center h-7 min-w-[3rem] rounded-md bg-[var(--surface-elevated)] border border-[var(--line)] text-xs font-black font-mono text-[var(--sea-ink)]">
                              B{item.coefficient}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {item.synonyms.length === 0 ? (
                              <span className="text-xs text-[var(--sea-ink-soft)] italic opacity-60">—</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(isExpanded ? item.synonyms : item.synonyms.slice(0, 3)).map((syn, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--sea-ink-soft)]"
                                  >
                                    <Tag size={9} className="opacity-40" />
                                    {syn}
                                  </span>
                                ))}
                                {item.synonyms.length > 3 && (
                                  <button
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                    className="inline-flex items-center gap-0.5 rounded-full bg-[var(--lagoon)]/8 px-2 py-0.5 text-[11px] font-semibold text-[var(--lagoon)] hover:bg-[var(--lagoon)]/15 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <>Réduire <ChevronUp size={11} /></>
                                    ) : (
                                      <>+{item.synonyms.length - 3} <ChevronDown size={11} /></>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </div>
    </>
  )
}
