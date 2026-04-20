import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  closeConversation,
  createOutgoingMessage,
  fetchConversations,
  fetchMessages,
  fetchPrescriptions,
  getApiErrorMessage,
  updateConversationWorkflow,
  fetchResults,
  uploadResult,
  updateResultStatus,
} from '../lib/api'
import type { FormEvent } from 'react'
import type {
  AnalysisRequestStatus,
  ConversationListItem,
  ConversationStatus,
  ConversationWorkflowUpdatePayload,
  MessageListItem,
  PrescriptionDetail,
  PricingTier,
  ResultDetail,
} from '../lib/api'
import { useAuth } from '../lib/useAuth'

import LoginForm from '../components/intake/LoginForm'
import ConversationListPanel from '../components/intake/ConversationList'
import MessageThread from '../components/intake/MessageThread'
import PrescriptionPanel from '../components/intake/PrescriptionPanel'
import SimulationPanel from '../components/intake/SimulationPanel'
import ResultPanel from '../components/intake/ResultPanel'
import PageHeader from '../components/layout/PageHeader'
import Spinner from '../components/Spinner'
import { labelize, statusTone, analysisStatusTone } from '../components/intake/utils'

const CONVERSATION_STATUSES: ConversationStatus[] = [
  'open',
  'pending_review',
  'prepared',
  'closed',
]

const ANALYSIS_STATUSES: AnalysisRequestStatus[] = [
  'received',
  'prescription_received',
  'in_review',
  'prepared',
]

export const Route = createFileRoute('/intake')({
  component: IntakeOpsPage,
})

/* ------------------------------------------------------------------ */
/* Main orchestrator                                                   */
/* ------------------------------------------------------------------ */

function IntakeOpsPage() {
  // Auth state (shared hook)
  const {
    currentOperator,
    isAuthLoading,
    authError,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    isLoggingIn,
    handleLogin,
    handleUnauthorized: baseHandleUnauthorized,
  } = useAuth()

  // Conversation list state
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all')
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [isConversationsLoading, setIsConversationsLoading] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  // Messages & prescriptions
  const [messages, setMessages] = useState<MessageListItem[]>([])
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [prescriptions, setPrescriptions] = useState<PrescriptionDetail[]>([])
  const [results, setResults] = useState<ResultDetail[]>([])

  // Action feedback
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Outgoing message
  const [outgoingText, setOutgoingText] = useState('')
  const [isSendingOutgoing, setIsSendingOutgoing] = useState(false)

  const [workflowConversationStatus, setWorkflowConversationStatus] = useState<ConversationStatus | ''>('')
  const [workflowAnalysisStatus, setWorkflowAnalysisStatus] = useState<AnalysisRequestStatus | ''>('')
  const [workflowInsuranceCode, setWorkflowInsuranceCode] = useState('')
  const [workflowNotes, setWorkflowNotes] = useState('')
  const [isUpdatingWorkflow, setIsUpdatingWorkflow] = useState(false)

  // Close conversation
  const [closeText, setCloseText] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [isClosingConversation, setIsClosingConversation] = useState(false)

  const showSimulationPanel = String(import.meta.env.VITE_SHOW_SIMULATION ?? '').toLowerCase() === 'true'

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const clearActionFeedback = useCallback(() => {
    setActionError(null)
    setActionSuccess(null)
  }, [])

  /* ---- Auth handlers ---- */

  const handleUnauthorized = useCallback((message: string) => {
    baseHandleUnauthorized(message)
    setConversations([])
    setConversationsError(null)
    setIsConversationsLoading(false)
    setSelectedConversationId(null)
    setMessages([])
    setMessagesError(null)
    setIsMessagesLoading(false)
    setActionError(null)
    setActionSuccess(null)
  }, [baseHandleUnauthorized])

  /* ---- Data loading ---- */

  const loadConversations = useCallback(
    async (opts?: { preferredConversationId?: string | null; signal?: AbortSignal }) => {
      setIsConversationsLoading(true)
      setConversationsError(null)
      try {
        const response = await fetchConversations({
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 50, offset: 0, signal: opts?.signal,
        })
        setConversations(response.items)
        setSelectedConversationId((currentId) => {
          const preferredId = opts?.preferredConversationId ?? currentId
          if (preferredId && response.items.some((c) => c.id === preferredId)) return preferredId
          return response.items[0]?.id ?? null
        })
      } catch (error: unknown) {
        if (opts?.signal?.aborted) return
        if (error instanceof ApiError && error.status === 401) { handleUnauthorized('Session expirée.'); return }
        setConversations([])
        setSelectedConversationId(null)
        setConversationsError(getApiErrorMessage(error))
      } finally {
        if (!opts?.signal?.aborted) setIsConversationsLoading(false)
      }
    },
    [handleUnauthorized, statusFilter],
  )

  const loadMessages = useCallback(
    async (conversationId: string, signal?: AbortSignal) => {
      setIsMessagesLoading(true)
      setMessagesError(null)
      try {
        const response = await fetchMessages({ conversationId, limit: 200, offset: 0, signal })
        setMessages(response.items)
        fetchPrescriptions(conversationId, signal)
          .then((res) => setPrescriptions(res.items))
          .catch(() => setPrescriptions([]))

        fetchResults(conversationId, signal)
          .then((res) => setResults(res))
          .catch(() => setResults([]))
      } catch (error: unknown) {
        if (signal?.aborted) return
        if (error instanceof ApiError && error.status === 401) { handleUnauthorized('Session expirée.'); return }
        setMessages([])
        setMessagesError(getApiErrorMessage(error))
      } finally {
        if (!signal?.aborted) setIsMessagesLoading(false)
      }
    },
    [handleUnauthorized],
  )

  const refreshSelectedConversation = useCallback(
    async (conversationId: string) => {
      await loadConversations({ preferredConversationId: conversationId })
      await loadMessages(conversationId)
    },
    [loadConversations, loadMessages],
  )

  // Load conversations on auth + filter changes
  useEffect(() => {
    if (!currentOperator) return
    const controller = new AbortController()
    void loadConversations({ signal: controller.signal })
    return () => { controller.abort() }
  }, [currentOperator, loadConversations])

  // Load messages when conversation selection changes
  useEffect(() => {
    if (!selectedConversationId) { setMessages([]); setPrescriptions([]); setResults([]); return }
    const controller = new AbortController()
    void loadMessages(selectedConversationId, controller.signal)
    return () => { controller.abort() }
  }, [selectedConversationId, loadMessages])

  /* ---- Action handlers ---- */

  const handleSendOutgoingMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!selectedConversationId || !outgoingText.trim()) return
      setIsSendingOutgoing(true)
      clearActionFeedback()
      try {
        await createOutgoingMessage(selectedConversationId, { text: outgoingText.trim() })
        setOutgoingText('')
        setActionSuccess('Message sortant enregistré.')
        await refreshSelectedConversation(selectedConversationId)
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 401) { handleUnauthorized('Session expirée.'); return }
        setActionError(getApiErrorMessage(error))
      } finally {
        setIsSendingOutgoing(false)
      }
    },
    [clearActionFeedback, handleUnauthorized, outgoingText, selectedConversationId, refreshSelectedConversation],
  )

  const handleUpdateWorkflow = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!selectedConversationId) return
      const payload: ConversationWorkflowUpdatePayload = {}
      if (workflowConversationStatus) payload.conversation_status = workflowConversationStatus
      if (workflowAnalysisStatus) payload.analysis_request_status = workflowAnalysisStatus
      if (workflowInsuranceCode) payload.insurance_code = workflowInsuranceCode
      if (workflowNotes.trim()) payload.notes = workflowNotes.trim()
      if (!payload.conversation_status && !payload.analysis_request_status && !payload.insurance_code && !payload.notes) return
      setIsUpdatingWorkflow(true)
      clearActionFeedback()
      try {
        await updateConversationWorkflow(selectedConversationId, payload)
        setWorkflowConversationStatus('')
        setWorkflowAnalysisStatus('')
        setWorkflowInsuranceCode('')
        setWorkflowNotes('')
        setActionSuccess('Statut mis à jour avec succès.')
        await refreshSelectedConversation(selectedConversationId)
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 401) { handleUnauthorized('Session expirée.'); return }
        setActionError(getApiErrorMessage(error))
      } finally {
        setIsUpdatingWorkflow(false)
      }
    },
    [clearActionFeedback, handleUnauthorized, workflowConversationStatus, workflowAnalysisStatus, workflowInsuranceCode, workflowNotes, selectedConversationId, refreshSelectedConversation],
  )

  const handleCloseConversation = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!selectedConversationId) return
      const finalText = closeText.trim()
      if (!finalText) { setActionError('Un message final est requis.'); return }
      if (!window.confirm('Confirmer la clôture de cette conversation ?')) return
      setIsClosingConversation(true)
      clearActionFeedback()
      try {
        await closeConversation(selectedConversationId, {
          message: { message_type: 'text', text: finalText },
          notes: closeNotes.trim() || undefined,
        })
        setCloseText('')
        setCloseNotes('')
        setActionSuccess('Conversation clôturée et message final enregistré.')
        await loadConversations({ preferredConversationId: selectedConversationId })
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 401) { handleUnauthorized('Session expirée.'); return }
        setActionError(getApiErrorMessage(error))
      } finally {
        setIsClosingConversation(false)
      }
    },
    [clearActionFeedback, closeNotes, closeText, handleUnauthorized, loadConversations, selectedConversationId],
  )

  const handleUploadResult = async (conversationId: string, fileUrl: string) => {
    if (!selectedConversationId) return
    clearActionFeedback()
    try {
      await uploadResult(conversationId, { file_url: fileUrl })
      setActionSuccess('Résultat uploadé avec succès.')
      await loadMessages(selectedConversationId)
      await loadConversations({ preferredConversationId: selectedConversationId })
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) { handleUnauthorized('Session expirée.'); return }
      setActionError(getApiErrorMessage(error))
    }
  }

  const handleUpdateResultStatus = async (resultId: string, status: string, notes?: string) => {
    if (!selectedConversationId) return
    clearActionFeedback()
    try {
      await updateResultStatus(resultId, { status, notes })
      setActionSuccess('Statut du résultat mis à jour.')
      await loadMessages(selectedConversationId)
      await loadConversations({ preferredConversationId: selectedConversationId })
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) { handleUnauthorized('Session expirée.'); return }
      setActionError(getApiErrorMessage(error))
    }
  }

  /* ---- Render ---- */

  if (!currentOperator) {
    return (
      <>
        <PageHeader
          kicker="Accueil"
          title="Bureau d'accueil"
          subtitle="Connectez-vous pour accéder aux conversations WhatsApp."
        />
        <div className="content-padding">
          <LoginForm
            isAuthLoading={isAuthLoading}
            authError={authError}
            loginEmail={loginEmail}
            loginPassword={loginPassword}
            isLoggingIn={isLoggingIn}
            onEmailChange={setLoginEmail}
            onPasswordChange={setLoginPassword}
            onSubmit={handleLogin}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        kicker="Opérations"
        title="Bureau d'accueil"
        subtitle="Conversations WhatsApp, ordonnances et suivi des résultats."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="status-pill">
                <span className="status-dot" />
                {conversations.length} conversations
              </span>
              {selectedConversation && (
                <>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(selectedConversation.status)}`}>
                    {labelize(selectedConversation.status)}
                  </span>
                  {selectedConversation.analysis_request_status ? (
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${analysisStatusTone(selectedConversation.analysis_request_status)}`}>
                      {labelize(selectedConversation.analysis_request_status)}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>
        }
      />

      {/* Two-column layout filling the content area */}
      <div className="flex-1 flex min-h-0">
        <div className="w-[300px] min-w-[250px] max-w-[340px] flex-shrink-0 overflow-y-auto border-r border-[var(--line)] p-3">
          <ConversationListPanel
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            statusFilter={statusFilter}
            isLoading={isConversationsLoading}
            error={conversationsError}
            onStatusFilterChange={setStatusFilter}
            onSelectConversation={(id) => {
              setSelectedConversationId(id)
              clearActionFeedback()
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedConversation ? (
            <div className="flex items-center justify-center h-full p-6 text-center">
              <div>
                <p className="island-kicker mb-1">Aucune sélection</p>
                <h2 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">Sélectionnez une conversation</h2>
                <p className="mt-2 mb-0 text-sm text-[var(--sea-ink-soft)]">Choisissez un fil patient depuis le panneau de gauche.</p>
              </div>
            </div>
          ) : (
            <div className="content-padding space-y-4">
              {/* Conversation detail header */}
              <div className="island-shell rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">
                      {selectedConversation.patient_name ?? 'Patient inconnu'}
                    </h2>
                    <p className="mt-0.5 mb-0 text-xs text-[var(--sea-ink-soft)]">
                      {selectedConversation.patient_phone ?? 'Numéro indisponible'} · ID: {selectedConversation.id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(selectedConversation.status)}`}>
                      {labelize(selectedConversation.status)}
                    </span>
                    {selectedConversation.analysis_request_status ? (
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${analysisStatusTone(selectedConversation.analysis_request_status)}`}>
                        {labelize(selectedConversation.analysis_request_status)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Message thread */}
              <MessageThread
                messages={messages}
                isLoading={isMessagesLoading}
                error={messagesError}
                onRefresh={() => {
                  if (selectedConversationId) {
                    clearActionFeedback()
                    void loadMessages(selectedConversationId)
                  }
                }}
              />

              {/* Prescription details */}
              <PrescriptionPanel prescriptions={prescriptions} />

              <ResultPanel
                results={results}
                analysisRequestId={selectedConversation.analysis_request_status ? selectedConversation.id : undefined}
                onUploadResult={handleUploadResult}
                onUpdateStatus={handleUpdateResultStatus}
              />

              {/* Assistant actions */}
              <section className="island-shell rounded-xl p-4">
                <p className="island-kicker mb-2">Actions assistante</p>
                {actionError ? (
                  <p className="mb-3 rounded-lg border border-red-300/60 bg-red-50/80 px-3 py-2 text-sm text-red-700">{actionError}</p>
                ) : null}
                {actionSuccess ? (
                  <p className="mb-3 rounded-lg border border-emerald-300/70 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700">{actionSuccess}</p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Send outgoing message */}
                  <form onSubmit={handleSendOutgoingMessage} className="space-y-2">
                    <h3 className="m-0 text-sm font-semibold text-[var(--sea-ink)]">Envoyer un message</h3>
                    <textarea
                      value={outgoingText}
                      onChange={(e) => setOutgoingText(e.target.value)}
                      rows={3}
                      placeholder="Rédigez la réponse assistante pour ce patient"
                      className="field-shell"
                    />
                    <button
                      type="submit"
                      disabled={isSendingOutgoing}
                      className="btn-primary"
                    >
                      {isSendingOutgoing ? <span className="flex items-center gap-2"><Spinner size="sm" /> Envoi…</span> : 'Enregistrer le message'}
                    </button>
                  </form>

                  {/* Update workflow */}
                  <form onSubmit={handleUpdateWorkflow} className="space-y-2">
                    <h3 className="m-0 text-sm font-semibold text-[var(--sea-ink)]">Mettre à jour le statut</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={workflowConversationStatus}
                        onChange={(e) => setWorkflowConversationStatus(e.target.value as ConversationStatus | '')}
                        className="field-shell"
                      >
                        <option value="">Statut conversation</option>
                        {CONVERSATION_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
                      </select>
                      <select
                        value={workflowAnalysisStatus}
                        onChange={(e) => setWorkflowAnalysisStatus(e.target.value as AnalysisRequestStatus | '')}
                        className="field-shell"
                      >
                        <option value="">Statut demande d'analyse</option>
                        {ANALYSIS_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
                      </select>
                      <select
                        value={workflowInsuranceCode}
                        onChange={(e) => setWorkflowInsuranceCode(e.target.value)}
                        className="field-shell sm:col-span-2"
                        id="insurance-selector"
                      >
                        <option value="">🏥 Assurance du patient</option>
                        <option value="cnops">CNOPS — Mutuelle public (80%)</option>
                        <option value="cnss">CNSS — AMO privé (70%)</option>
                        <option value="axa">AXA Assurance (80%)</option>
                        <option value="rma">RMA Watanya (80%)</option>
                        <option value="payant">Payant — Sans assurance</option>
                      </select>
                    </div>
                    <textarea
                      value={workflowNotes}
                      onChange={(e) => setWorkflowNotes(e.target.value)}
                      rows={2}
                      placeholder="Notes de statut (optionnel)"
                      className="field-shell"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingWorkflow}
                      className="btn-primary"
                    >
                      {isUpdatingWorkflow ? <span className="flex items-center gap-2"><Spinner size="sm" /> Mise à jour…</span> : 'Mettre à jour'}
                    </button>
                  </form>
                </div>
              </section>

              {/* Close conversation */}
              <section className="island-shell rounded-xl p-4">
                <h3 className="m-0 mb-3 text-sm font-semibold text-[var(--sea-ink)]">
                  Clôturer la conversation
                </h3>
                <form onSubmit={handleCloseConversation} className="space-y-2">
                  <textarea
                    value={closeText}
                    onChange={(e) => setCloseText(e.target.value)}
                    rows={2}
                    placeholder="Message final envoyé au patient avant clôture"
                    className="field-shell"
                  />
                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Notes de clôture (optionnel)"
                    className="field-shell"
                  />
                  <button
                    type="submit"
                    disabled={isClosingConversation}
                    className="btn-danger"
                  >
                    {isClosingConversation ? <span className="flex items-center gap-2"><Spinner size="sm" /> Clôture…</span> : 'Clôturer'}
                  </button>
                </form>
              </section>

              {/* WhatsApp simulation */}
              {showSimulationPanel ? (
                <SimulationPanel
                  onMessageSent={(conversationId) => {
                    void loadConversations({ preferredConversationId: conversationId })
                  }}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
