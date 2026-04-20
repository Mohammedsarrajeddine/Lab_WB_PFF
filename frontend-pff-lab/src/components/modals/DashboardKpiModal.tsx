import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from '@tanstack/react-router'
import {
  X,
  Users,
  MessageSquare,
  FileText,
  TrendingUp,
  Phone,
  ArrowRight,
  ChevronRight,
  Search,
  Hash,
} from 'lucide-react'
import {
  fetchPatients,
  fetchConversations,
  getApiErrorMessage,
} from '../../lib/api'
import type {
  PatientItem,
  ConversationListItem,
  DashboardStats,
} from '../../lib/api'
import { labelize } from '../intake/utils'
import Spinner from '../Spinner'

export type KpiModalType = 'patients' | 'conversations' | 'prescriptions' | 'messages' | null

interface DashboardKpiModalProps {
  type: KpiModalType
  stats: DashboardStats | null
  onClose: () => void
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

const modalMeta: Record<string, { icon: typeof Users; color: string; title: string; subtitle: string }> = {
  patients: {
    icon: Users,
    color: 'var(--lagoon)',
    title: 'Patients enregistrés',
    subtitle: 'Liste complète des patients dans le système',
  },
  conversations: {
    icon: MessageSquare,
    color: 'var(--palm)',
    title: 'Toutes les conversations',
    subtitle: 'Historique complet des échanges WhatsApp',
  },
  prescriptions: {
    icon: FileText,
    color: 'var(--warning)',
    title: 'Ordonnances reçues',
    subtitle: 'Conversations contenant des ordonnances',
  },
  messages: {
    icon: TrendingUp,
    color: 'var(--lagoon-deep)',
    title: 'Activité des messages',
    subtitle: 'Dernières conversations actives',
  },
}

export default function DashboardKpiModal({ type, stats, onClose }: DashboardKpiModalProps) {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const isOpen = type !== null

  useEffect(() => {
    if (!type) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setSearchTerm('')

    if (type === 'patients') {
      fetchPatients({ limit: 50, signal: controller.signal })
        .then((res) => setPatients(res.items))
        .catch((e) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)) })
        .finally(() => setLoading(false))
    } else {
      fetchConversations({ limit: 50, signal: controller.signal })
        .then((res) => setConversations(res.items))
        .catch((e) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)) })
        .finally(() => setLoading(false))
    }

    return () => controller.abort()
  }, [type])

  if (!type) return null

  const meta = modalMeta[type]
  const Icon = meta.icon

  const filteredPatients = patients.filter((p) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (p.full_name?.toLowerCase().includes(q)) ||
      p.phone_e164.toLowerCase().includes(q)
    )
  })

  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (c.patient_name?.toLowerCase().includes(q)) ||
      (c.patient_phone?.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    )
  })

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-[var(--bg-base)] shadow-[0_24px_60px_rgba(0,0,0,0.6)] border border-[var(--line-strong)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-6 py-5">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
                >
                  <Icon size={24} />
                </div>
                <div>
                  <h2 className="m-0 text-xl font-bold text-[var(--sea-ink)]">{meta.title}</h2>
                  <p className="m-0 mt-0.5 text-xs text-[var(--sea-ink-soft)]">{meta.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:bg-[var(--danger)]/20 hover:text-[var(--danger)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stats summary bar */}
            {stats && (
              <div className="flex items-center gap-6 border-b border-[var(--line)] bg-[var(--surface)] px-6 py-3">
                {type === 'patients' && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--sea-ink)]">{stats.total_patients}</span>
                      <span className="text-[var(--sea-ink-soft)]">patients total</span>
                    </div>
                    <div className="h-4 w-px bg-[var(--line)]" />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--palm)]">{stats.total_conversations}</span>
                      <span className="text-[var(--sea-ink-soft)]">conversations</span>
                    </div>
                    <div className="h-4 w-px bg-[var(--line)]" />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--warning)]">{stats.total_prescriptions}</span>
                      <span className="text-[var(--sea-ink-soft)]">ordonnances</span>
                    </div>
                  </>
                )}
                {type === 'conversations' && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full bg-[var(--lagoon)]" />
                      <span className="font-bold text-[var(--sea-ink)]">{stats.open_conversations}</span>
                      <span className="text-[var(--sea-ink-soft)]">ouvertes</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full bg-[var(--warning)]" />
                      <span className="font-bold text-[var(--sea-ink)]">{stats.pending_conversations}</span>
                      <span className="text-[var(--sea-ink-soft)]">en attente</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full bg-[var(--palm)]" />
                      <span className="font-bold text-[var(--sea-ink)]">{stats.prepared_conversations}</span>
                      <span className="text-[var(--sea-ink-soft)]">préparées</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full bg-[var(--sea-ink-soft)]" />
                      <span className="font-bold text-[var(--sea-ink)]">{stats.closed_conversations}</span>
                      <span className="text-[var(--sea-ink-soft)]">clôturées</span>
                    </div>
                  </>
                )}
                {type === 'prescriptions' && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--warning)]">{stats.total_prescriptions}</span>
                      <span className="text-[var(--sea-ink-soft)]">ordonnances au total</span>
                    </div>
                    <div className="h-4 w-px bg-[var(--line)]" />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--sea-ink)]">{stats.total_conversations}</span>
                      <span className="text-[var(--sea-ink-soft)]">conversations</span>
                    </div>
                  </>
                )}
                {type === 'messages' && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--lagoon-deep)]">{stats.total_messages}</span>
                      <span className="text-[var(--sea-ink-soft)]">messages échangés</span>
                    </div>
                    <div className="h-4 w-px bg-[var(--line)]" />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--sea-ink)]">{stats.total_conversations}</span>
                      <span className="text-[var(--sea-ink-soft)]">conversations</span>
                    </div>
                    <div className="h-4 w-px bg-[var(--line)]" />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--sea-ink)]">{stats.total_patients}</span>
                      <span className="text-[var(--sea-ink-soft)]">patients</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Search bar */}
            <div className="px-6 py-3 border-b border-[var(--line)] bg-[var(--surface)]">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-base)] border border-[var(--line)] px-3 py-2">
                <Search size={15} className="text-[var(--sea-ink-soft)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={type === 'patients' ? 'Rechercher un patient…' : 'Rechercher une conversation…'}
                  className="flex-1 bg-transparent text-sm outline-none text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {error ? (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
                  {error}
                </div>
              ) : loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : type === 'patients' ? (
                /* Patients list */
                filteredPatients.length === 0 ? (
                  <EmptyState icon={Users} text="Aucun patient trouvé" />
                ) : (
                  <div className="grid gap-2">
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { onClose(); navigate({ to: `/patients/${p.id}` }) }}
                        className="group flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left transition-all hover:border-[var(--lagoon)]/40 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon)] text-white font-bold text-base shadow-sm">
                            {(p.full_name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                              {p.full_name || 'Patient inconnu'}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-[11px] text-[var(--sea-ink-soft)]">
                                <Phone size={10} /> {p.phone_e164}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-[var(--sea-ink-soft)]">
                                <MessageSquare size={10} /> {p.conversation_count} conv.
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="m-0 text-[11px] text-[var(--sea-ink-soft)]">
                              {p.last_message_at ? timeAgo(p.last_message_at) : 'Aucune activité'}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-[var(--sea-ink-soft)] group-hover:text-[var(--lagoon)] transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                /* Conversations list */
                filteredConversations.length === 0 ? (
                  <EmptyState icon={MessageSquare} text="Aucune conversation trouvée" />
                ) : (
                  <div className="grid gap-2">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          onClose()
                          navigate({ to: '/intake', search: { conversationId: conv.id } as any })
                        }}
                        className="group flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left transition-all hover:border-[var(--lagoon)]/40 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            conv.status === 'open' ? 'bg-[var(--lagoon)]/10 text-[var(--lagoon)]' :
                            conv.status === 'pending_review' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' :
                            conv.status === 'prepared' ? 'bg-[var(--palm)]/10 text-[var(--palm)]' :
                            'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]'
                          }`}>
                            <MessageSquare size={18} />
                          </div>
                          <div>
                            <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                              {conv.patient_name || 'Patient inconnu'}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-[11px] text-[var(--sea-ink-soft)] font-mono">
                                <Hash size={10} /> {conv.id.split('-')[0].toUpperCase()}
                              </span>
                              {conv.patient_phone && (
                                <span className="flex items-center gap-1 text-[11px] text-[var(--sea-ink-soft)]">
                                  <Phone size={10} /> {conv.patient_phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              conv.status === 'open' ? 'bg-[var(--lagoon)]/10 text-[var(--lagoon)]' :
                              conv.status === 'pending_review' ? 'bg-amber-500/10 text-amber-500' :
                              conv.status === 'prepared' ? 'bg-[var(--palm)]/10 text-[var(--palm)]' :
                              'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]'
                            }`}>
                              {labelize(conv.status)}
                            </span>
                            <p className="m-0 mt-1 text-[11px] text-[var(--sea-ink-soft)]">
                              {conv.updated_at ? timeAgo(conv.updated_at) : '—'}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-[var(--sea-ink-soft)] group-hover:text-[var(--lagoon)] transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface)] px-6 py-3">
              <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                {type === 'patients'
                  ? `${filteredPatients.length} patient(s) affiché(s)`
                  : `${filteredConversations.length} conversation(s) affichée(s)`
                }
              </p>
              <button
                onClick={() => {
                  onClose()
                  if (type === 'patients') navigate({ to: '/patients' })
                  else navigate({ to: '/intake' })
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--link-bg-hover)]"
                style={{ color: meta.color }}
              >
                Voir tout <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center text-[var(--sea-ink-soft)] border-2 border-dashed border-[var(--line)] rounded-xl opacity-70">
      <Icon size={32} className="mb-2 opacity-50" />
      <p className="m-0 text-sm font-medium text-[var(--sea-ink)]">{text}</p>
    </div>
  )
}
