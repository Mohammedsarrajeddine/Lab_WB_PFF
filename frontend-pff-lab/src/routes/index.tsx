import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import BackendHealthCard from '../components/BackendHealthCard'
import Spinner from '../components/Spinner'
import PageHeader from '../components/layout/PageHeader'
import ConversationListModal from '../components/modals/ConversationListModal'
import DashboardKpiModal from '../components/modals/DashboardKpiModal'
import type { KpiModalType } from '../components/modals/DashboardKpiModal'
import {
  Users,
  MessageSquare,
  ArrowRight,
  HeartPulse,
  Inbox,
  FileText,
  UserCog,
  FlaskConical,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../lib/useAuth'
import { fetchDashboardStats, getApiErrorMessage } from '../lib/api'
import type { DashboardStats, ConversationStatus } from '../lib/api'

export const Route = createFileRoute('/')({ component: App })

function App() {
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
    handleLogout,
  } = useAuth()

  const isAdmin = currentOperator?.role === 'admin'
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, status: ConversationStatus | undefined, title: string}>({
    isOpen: false,
    status: undefined,
    title: ''
  })
  const [kpiModal, setKpiModal] = useState<KpiModalType>(null)

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchDashboardStats()
      setStats(data)
      setStatsError(null)
    } catch (e) {
      setStatsError(getApiErrorMessage(e))
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    void loadStats()
    const interval = setInterval(loadStats, 60_000)
    return () => clearInterval(interval)
  }, [isAdmin, loadStats])

  // Not authenticated
  if (!currentOperator) {
    return (
      <>
        <PageHeader
          kicker="Administration"
          title="Tableau de bord"
          subtitle="Espace administration — connectez-vous pour accéder à la console."
        />
        <div className="content-padding">
          <div className="max-w-md rise-in">
            <div className="island-shell p-6">
              <h2 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">
                {isAuthLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" className="text-[var(--lagoon)]" />
                    Vérification de session…
                  </span>
                ) : (
                  'Connexion administrateur'
                )}
              </h2>

              {authError ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {authError}
                </p>
              ) : null}

              <form onSubmit={handleLogin} className="mt-4 grid gap-3">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@lab.local"
                  autoComplete="username"
                  disabled={isAuthLoading || isLoggingIn}
                  className="field-shell"
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mot de passe"
                  autoComplete="current-password"
                  disabled={isAuthLoading || isLoggingIn}
                  className="field-shell"
                />
                <button
                  type="submit"
                  disabled={isAuthLoading || isLoggingIn}
                  className="btn-primary w-fit"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" /> Connexion…
                    </span>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Not admin
  if (!isAdmin) {
    return (
      <>
        <PageHeader
          kicker="Sécurité"
          title="Accès restreint"
          subtitle={`Connecté en tant que ${currentOperator.full_name ?? currentOperator.email} (${currentOperator.role})`}
          actions={
            <button type="button" onClick={handleLogout} className="btn-secondary text-sm">
              Se déconnecter
            </button>
          }
        />
        <div className="content-padding rise-in">
          <div className="island-shell p-6 max-w-lg">
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
              Ce rôle ne permet pas d'accéder à la vue globale.
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/intake" className="btn-primary text-sm no-underline">
                Ouvrir Bureau d'accueil
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Admin dashboard
  return (
    <>
      <PageHeader
        kicker="Vue Globale"
        title="Tableau de bord"
        subtitle="Vue d'ensemble de la plateforme opérationnelle."
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--link-bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--sea-ink)]">
              {currentOperator.full_name ?? currentOperator.email}
            </span>
            <button type="button" onClick={handleLogout} className="btn-secondary text-xs">
              Déconnexion
            </button>
          </div>
        }
      />

      <div className="content-padding space-y-4 rise-in">
        {statsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {statsError}
          </div>
        )}

        {/* KPI Stats Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => setKpiModal('patients')}
            className="island-shell p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--lagoon)]/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon)]/10 text-[var(--lagoon)]">
                <Users size={20} />
              </div>
              <div>
                <p className="m-0 text-2xl font-bold text-[var(--sea-ink)]">{stats?.total_patients ?? '–'}</p>
                <p className="m-0 text-xs text-[var(--sea-ink-soft)]">Patients</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setKpiModal('conversations')}
            className="island-shell p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--palm)]/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--palm)]/10 text-[var(--palm)]">
                <MessageSquare size={20} />
              </div>
              <div>
                <p className="m-0 text-2xl font-bold text-[var(--sea-ink)]">{stats?.total_conversations ?? '–'}</p>
                <p className="m-0 text-xs text-[var(--sea-ink-soft)]">Conversations</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setKpiModal('prescriptions')}
            className="island-shell p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--warning)]/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
                <FileText size={20} />
              </div>
              <div>
                <p className="m-0 text-2xl font-bold text-[var(--sea-ink)]">{stats?.total_prescriptions ?? '–'}</p>
                <p className="m-0 text-xs text-[var(--sea-ink-soft)]">Ordonnances</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setKpiModal('messages')}
            className="island-shell p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--lagoon-deep)]/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon-deep)]/10 text-[var(--lagoon-deep)]">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="m-0 text-2xl font-bold text-[var(--sea-ink)]">{stats?.total_messages ?? '–'}</p>
                <p className="m-0 text-xs text-[var(--sea-ink-soft)]">Messages</p>
              </div>
            </div>
          </button>
        </div>

        {/* Conversation Status Breakdown */}
        <div className="island-shell p-5">
          <h3 className="m-0 mb-4 text-base font-bold text-[var(--sea-ink)]">État des conversations</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <button 
              onClick={() => setModalConfig({ isOpen: true, status: 'open', title: 'Conversations Ouvertes' })}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--line)] p-3 cursor-pointer hover:border-[var(--lagoon)]/50 transition-colors text-left focus:outline-none"
            >
              <Inbox size={18} className="text-[var(--lagoon)]" />
              <div>
                <p className="m-0 text-lg font-bold text-[var(--sea-ink)]">{stats?.open_conversations ?? 0}</p>
                <p className="m-0 text-[11px] font-medium text-[var(--lagoon)]">Ouvertes</p>
              </div>
            </button>
            <button 
              onClick={() => setModalConfig({ isOpen: true, status: 'pending_review', title: 'Conversations En Attente' })}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--line)] p-3 cursor-pointer hover:border-[var(--warning)]/50 transition-colors text-left focus:outline-none"
            >
              <Clock size={18} className="text-[var(--warning)]" />
              <div>
                <p className="m-0 text-lg font-bold text-[var(--sea-ink)]">{stats?.pending_conversations ?? 0}</p>
                <p className="m-0 text-[11px] font-medium text-[var(--warning)]">En attente</p>
              </div>
            </button>
            <button 
              onClick={() => setModalConfig({ isOpen: true, status: 'prepared', title: 'Conversations Préparées' })}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--line)] p-3 cursor-pointer hover:border-[var(--palm)]/50 transition-colors text-left focus:outline-none"
            >
              <CheckCircle2 size={18} className="text-[var(--palm)]" />
              <div>
                <p className="m-0 text-lg font-bold text-[var(--sea-ink)]">{stats?.prepared_conversations ?? 0}</p>
                <p className="m-0 text-[11px] font-medium text-[var(--palm)]">Préparées</p>
              </div>
            </button>
            <button 
              onClick={() => setModalConfig({ isOpen: true, status: 'closed', title: 'Conversations Clôturées' })}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--line)] p-3 cursor-pointer hover:border-[var(--sea-ink)]/30 transition-colors text-left focus:outline-none"
            >
              <CheckCircle2 size={18} className="text-[var(--sea-ink-soft)]" />
              <div>
                <p className="m-0 text-lg font-bold text-[var(--sea-ink)]">{stats?.closed_conversations ?? 0}</p>
                <p className="m-0 text-[11px] font-medium text-[var(--sea-ink-soft)]">Clôturées</p>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/intake"
            className="island-shell flex items-center gap-4 p-4 no-underline transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon)]/10 text-[var(--lagoon)]">
              <Inbox size={22} />
            </div>
            <div className="flex-1">
              <h3 className="m-0 text-sm font-bold text-[var(--sea-ink)]">Bureau d'accueil</h3>
              <p className="m-0 mt-0.5 text-xs text-[var(--sea-ink-soft)]">Conversations et ordonnances</p>
            </div>
            <ArrowRight size={16} className="text-[var(--sea-ink-soft)]" />
          </Link>
          <Link
            to="/chat"
            className="island-shell flex items-center gap-4 p-4 no-underline transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--palm)]/10 text-[var(--palm)]">
              <HeartPulse size={22} />
            </div>
            <div className="flex-1">
              <h3 className="m-0 text-sm font-bold text-[var(--sea-ink)]">Assistant IA</h3>
              <p className="m-0 mt-0.5 text-xs text-[var(--sea-ink-soft)]">Chatbot patient RAG</p>
            </div>
            <ArrowRight size={16} className="text-[var(--sea-ink-soft)]" />
          </Link>
          <Link
            to="/patients"
            className="island-shell flex items-center gap-4 p-4 no-underline transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon-deep)]/10 text-[var(--lagoon-deep)]">
              <Users size={22} />
            </div>
            <div className="flex-1">
              <h3 className="m-0 text-sm font-bold text-[var(--sea-ink)]">Patients</h3>
              <p className="m-0 mt-0.5 text-xs text-[var(--sea-ink-soft)]">Gestion des dossiers patients</p>
            </div>
            <ArrowRight size={16} className="text-[var(--sea-ink-soft)]" />
          </Link>
          <Link
            to="/operators"
            className="island-shell flex items-center gap-4 p-4 no-underline transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
              <UserCog size={22} />
            </div>
            <div className="flex-1">
              <h3 className="m-0 text-sm font-bold text-[var(--sea-ink)]">Opérateurs</h3>
              <p className="m-0 mt-0.5 text-xs text-[var(--sea-ink-soft)]">Gestion des comptes</p>
            </div>
            <ArrowRight size={16} className="text-[var(--sea-ink-soft)]" />
          </Link>
          <Link
            to="/analyses"
            className="island-shell flex items-center gap-4 p-4 no-underline transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--palm)]/20 text-[var(--palm)]">
              <FlaskConical size={22} />
            </div>
            <div className="flex-1">
              <h3 className="m-0 text-sm font-bold text-[var(--sea-ink)]">Analyses</h3>
              <p className="m-0 mt-0.5 text-xs text-[var(--sea-ink-soft)]">Catalogue d'analyses médicales</p>
            </div>
            <ArrowRight size={16} className="text-[var(--sea-ink-soft)]" />
          </Link>
        </div>

        {/* Platform info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="island-shell p-4">
            <h3 className="m-0 mb-2 text-sm font-bold text-[var(--sea-ink)]">Équipe</h3>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lagoon)] text-xs font-bold text-white">
                <UserCog size={14} />
              </div>
              <div>
                <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                  {stats?.active_operators ?? '–'} / {stats?.total_operators ?? '–'} opérateurs actifs
                </p>
                <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                  {stats?.total_analyses_catalog ?? '–'} analyses au catalogue
                </p>
              </div>
            </div>
          </div>
          <BackendHealthCard />
        </div>
      </div>
      
      <ConversationListModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        subtitle="Sélectionnez une conversation pour être redirigé vers le bureau d'accueil"
        fetchParams={{ status: modalConfig.status }}
      />

      <DashboardKpiModal
        type={kpiModal}
        stats={stats}
        onClose={() => setKpiModal(null)}
      />
    </>
  )
}
