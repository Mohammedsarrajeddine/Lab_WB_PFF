import { useEffect, useState } from 'react'
import { API_BASE_URL, fetchBackendHealth } from '../lib/api'
import type { BackendHealth } from '../lib/api'

export default function BackendHealthCard() {
  const [health, setHealth] = useState<BackendHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    setIsLoading(true)

    fetchBackendHealth(controller.signal)
      .then((payload) => {
        setHealth(payload)
        setError(null)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        const message = err instanceof Error ? err.message : 'Request failed'
        setError(message)
        setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [])

  const isOnline = Boolean(health && !error)
  const statusLabel = isLoading ? 'checking' : isOnline ? 'online' : 'unreachable'
  const statusTone = isLoading
    ? 'border-amber-300/65 bg-amber-100/70 text-amber-800'
    : isOnline
      ? 'border-emerald-300/65 bg-emerald-100/75 text-emerald-800'
      : 'border-red-300/65 bg-red-100/75 text-red-800'

  return (
    <section className="island-shell rounded-xl p-5">
      <p className="island-kicker mb-2">Backend connection</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-2xl font-semibold text-[var(--sea-ink)]">FastAPI status</h2>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 mb-0 text-sm text-[var(--sea-ink-soft)]">
        API base URL: <code>{API_BASE_URL}</code>
      </p>

      {health ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] bg-white/58 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--kicker)]">Health</dt>
            <dd className="m-0 mt-1 font-semibold text-[var(--sea-ink)]">{health.status}</dd>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white/58 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--kicker)]">Application</dt>
            <dd className="m-0 mt-1 font-semibold text-[var(--sea-ink)]">{health.app_name}</dd>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white/58 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--kicker)]">Environment</dt>
            <dd className="m-0 mt-1 font-semibold text-[var(--sea-ink)]">{health.environment}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 m-0 text-sm text-[var(--sea-ink-soft)]">
          {error
            ? `Could not reach backend (${error}).`
            : 'Checking backend health endpoint...'}
        </p>
      )}
    </section>
  )
}
