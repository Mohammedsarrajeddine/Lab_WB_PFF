import { SkeletonCard } from '../Skeleton'
import { labelize, formatDateTime, statusTone } from './utils'
import type { ConversationListItem, ConversationStatus } from '../../lib/api'

const CONVERSATION_STATUSES: ConversationStatus[] = [
  'open',
  'pending_review',
  'prepared',
  'closed',
]

interface ConversationListProps {
  conversations: ConversationListItem[]
  selectedConversationId: string | null
  statusFilter: ConversationStatus | 'all'
  isLoading: boolean
  error: string | null
  onStatusFilterChange: (status: ConversationStatus | 'all') => void
  onSelectConversation: (id: string) => void
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  statusFilter,
  isLoading,
  error,
  onStatusFilterChange,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">Conversations</h2>
        <span className="status-pill">
          <span className="status-dot" />
          {conversations.length}
        </span>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--kicker)]">
          Filtrer par statut
        </label>
        <select
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as ConversationStatus | 'all')
          }
          className="field-shell"
        >
          <option value="all">Tous les statuts</option>
          {CONVERSATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labelize(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <p className="m-0 rounded-xl border border-red-300/60 bg-red-50/70 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : conversations.length === 0 ? (
          <p className="m-0 rounded-xl border border-[var(--line)] bg-white/52 px-3 py-2 text-sm text-[var(--sea-ink-soft)]">
            Aucune conversation trouvée pour ce filtre.
          </p>
        ) : (
          conversations.map((conversation) => {
            const isActive = conversation.id === selectedConversationId

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-[rgba(0,74,198,0.45)] bg-[rgba(37,99,235,0.14)] shadow-[0_12px_20px_rgba(37,99,235,0.18)]'
                    : 'border-[var(--line)] bg-[var(--surface-elevated)]/80 hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                    {conversation.patient_name ?? 'Patient inconnu'}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(
                      conversation.status,
                    )}`}
                  >
                    {labelize(conversation.status)}
                  </span>
                </div>
                <p className="mt-1 mb-0 line-clamp-2 text-xs text-[var(--sea-ink-soft)]">
                  {conversation.last_message_preview ?? 'Aucun aperçu de message'}
                </p>
                <p className="mt-1 mb-0 text-[11px] text-[var(--sea-ink-soft)]">
                  {formatDateTime(conversation.last_message_at)}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
