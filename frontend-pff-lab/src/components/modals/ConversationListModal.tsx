import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { X, Clock, MessageSquare, AlertCircle } from 'lucide-react'
import { fetchConversations, getApiErrorMessage } from '../../lib/api'
import type { ConversationListItem, ConversationStatus } from '../../lib/api'
import { labelize } from '../intake/utils'
import Spinner from '../Spinner'

interface ConversationListModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  fetchParams: {
    status?: ConversationStatus
    patient_id?: string
  }
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ConversationListModal({
  isOpen,
  onClose,
  title,
  subtitle,
  fetchParams,
}: ConversationListModalProps) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchConversations({ ...fetchParams, limit: 50, signal: controller.signal })
      .then((res) => setConversations(res.items))
      .catch((e) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(e))
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [isOpen, fetchParams.status, fetchParams.patient_id])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-base)] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-6 py-4">
              <div>
                <h2 className="m-0 flex items-center gap-2 text-xl font-bold text-[var(--sea-ink)]">
                  <MessageSquare size={20} className="text-[var(--lagoon)]" />
                  {title}
                </h2>
                {subtitle && (
                  <p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--danger)]/20 hover:text-[var(--danger)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[var(--surface-strong)] p-4">
              {error ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
                  <AlertCircle size={16} /> {error}
                </div>
              ) : loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] text-[var(--sea-ink-soft)] opacity-70">
                  <MessageSquare size={32} className="mb-2 opacity-50" />
                  <p className="m-0 text-sm font-medium text-[var(--sea-ink)]">Aucune conversation trouvée.</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onClose()
                        navigate({ to: '/intake', search: { conversationId: conv.id } as any })
                      }}
                      className="group flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left transition-all hover:border-[var(--lagoon)]/30 hover:bg-[var(--chip-bg)] hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-[var(--surface)] ${
                            conv.status === 'pending_review'
                              ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                              : conv.status === 'prepared'
                                ? 'bg-[var(--palm)]/10 text-[var(--palm)]'
                                : 'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]'
                          }`}
                        >
                          {conv.last_message_at ? <Clock size={18} /> : <MessageSquare size={18} />}
                        </div>
                        <div>
                          <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                            {conv.patient_name || 'Patient inconnu'}
                          </p>
                          <p className="m-0 mt-0.5 max-w-[280px] truncate font-mono text-[11px] text-[var(--sea-ink-soft)]">
                            ID: {conv.id.split('-')[0].toUpperCase()} • Tél: {conv.patient_phone || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              conv.status === 'open'
                                ? 'bg-[var(--lagoon)]/10 text-[var(--lagoon)]'
                                : conv.status === 'pending_review'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : conv.status === 'closed'
                                    ? 'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]'
                                    : 'bg-[var(--palm)]/10 text-[var(--palm)]'
                            }`}
                          >
                            {labelize(conv.status)}
                          </span>
                          <p className="m-0 mt-1 text-[11px] font-medium text-[var(--sea-ink-soft)]">
                            {timeAgo(conv.updated_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
