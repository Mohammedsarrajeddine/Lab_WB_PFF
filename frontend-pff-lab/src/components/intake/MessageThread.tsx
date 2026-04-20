import Spinner from '../Spinner'
import { SkeletonBlock } from '../Skeleton'
import { labelize, formatDateTime } from './utils'
import type { MessageListItem } from '../../lib/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/** Rewrite Graph API media URLs to go through the backend proxy. */
function proxyMediaUrl(url: string): string {
  const match = url.match(/graph\.facebook\.com\/v[\d.]+\/(\d+)/)
  if (match) {
    return `${API_BASE}/api/v1/media/whatsapp/${match[1]}`
  }
  return url
}

interface MessageThreadProps {
  messages: MessageListItem[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

export default function MessageThread({
  messages,
  isLoading,
  error,
  onRefresh,
}: MessageThreadProps) {
  return (
    <section className="island-shell glass-panel rounded-2xl p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">
          Fil des messages
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
        >
          Rafraîchir
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]">
          <Spinner size="sm" className="text-[var(--lagoon)]" />
          Chargement de l'historique des messages…
        </div>
      ) : error ? (
        <p className="m-0 rounded-xl border border-red-300/60 bg-red-50/80 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : messages.length === 0 ? (
        <SkeletonBlock lines={2} className="opacity-50" />
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {messages.map((message) => {
            const isOutgoing = message.direction === 'outgoing'

            return (
              <li
                key={message.id}
                className={`max-w-[92%] rounded-2xl border px-3 py-2 text-sm ${
                  isOutgoing
                    ? 'ml-auto border-[rgba(0,74,198,0.42)] bg-[rgba(37,99,235,0.14)] shadow-[0_8px_18px_rgba(37,99,235,0.16)]'
                    : 'mr-auto border-[var(--line)] bg-[var(--surface-elevated)]/84 shadow-[0_6px_14px_rgba(15,23,42,0.08)]'
                }`}
              >
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
                  {isOutgoing ? 'Sortant' : 'Entrant'} –{' '}
                  {labelize(message.message_type)}
                </p>
                {message.content_text ? (
                  <p className="mt-1 mb-0 whitespace-pre-wrap text-[var(--sea-ink)]">
                    {message.content_text}
                  </p>
                ) : null}
                {message.media_url ? (
                  <div className="mt-2">
                    {message.mime_type?.startsWith('image/') ? (
                      <img
                        src={proxyMediaUrl(message.media_url)}
                        alt="Document envoyé"
                        className="max-h-48 max-w-full rounded-lg border border-[var(--line)] object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                    <p className="mt-1 mb-0 text-xs text-[var(--sea-ink-soft)]">
                      📎{' '}
                      <a
                        href={proxyMediaUrl(message.media_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate"
                      >
                        {message.mime_type === 'application/pdf'
                          ? 'Voir le PDF'
                          : 'Voir le fichier'}
                      </a>
                      {message.mime_type ? (
                        <span className="ml-1 opacity-60">
                          ({message.mime_type})
                        </span>
                      ) : null}
                    </p>
                  </div>
                ) : null}
                <p className="mt-1 mb-0 text-[11px] text-[var(--sea-ink-soft)]">
                  {formatDateTime(message.sent_at)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
