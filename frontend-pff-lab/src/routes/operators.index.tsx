import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchOperators,
  createOperator,
  getApiErrorMessage,
  getStoredAccessToken,
  fetchCurrentOperator,
} from '../lib/api'
import type { OperatorUser } from '../lib/api'
import PageHeader from '../components/layout/PageHeader'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import { ShieldCheck, UserCog, Mail, Calendar, Plus, X } from 'lucide-react'
import { labelize, formatDateTime } from '../components/intake/utils'

export const Route = createFileRoute('/operators/')({
  component: OperatorsPage,
})

function OperatorsPage() {
  const [operator, setOperator] = useState<OperatorUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [operators, setOperators] = useState<OperatorUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createName, setCreateName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<'intake_operator' | 'intake_manager' | 'admin'>('intake_operator')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    const token = getStoredAccessToken()
    if (!token) {
      setAuthChecked(true)
      setLoading(false)
      return
    }
    fetchCurrentOperator()
      .then((op) => {
        setOperator(op)
        setAuthChecked(true)
      })
      .catch(() => {
        setAuthChecked(true)
        setLoading(false)
      })
  }, [])

  const loadOperators = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchOperators()
      setOperators(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authChecked || !operator || operator.role !== 'admin') return
    void loadOperators()
  }, [authChecked, operator, loadOperators])

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createEmail || !createPassword) {
      setCreateError("L'email et le mot de passe sont requis")
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    try {
      const newOp = await createOperator({
        email: createEmail,
        full_name: createName,
        password: createPassword,
        role: createRole,
        is_active: true
      })
      setOperators([newOp, ...operators])
      setTotal(t => t + 1)
      setIsCreateModalOpen(false)
      setCreateEmail('')
      setCreateName('')
      setCreatePassword('')
      setCreateRole('intake_operator')
    } catch (err) {
      setCreateError(getApiErrorMessage(err))
    } finally {
      setCreateLoading(false)
    }
  }

  if (!authChecked || (loading && !operators.length)) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!operator || operator.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="island-shell p-8 text-center max-w-sm">
          <ShieldCheck size={40} className="mx-auto mb-3 text-[var(--danger)]" />
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">Accès réservé</h2>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Seuls les administrateurs peuvent accéder à cette page.
          </p>
        </div>
      </div>
    )
  }

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'intake_manager':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="Gestion des opérateurs"
        subtitle={`${total} opérateur(s) enregistré(s)`}
        actions={
          <button
             onClick={() => setIsCreateModalOpen(true)}
             className="flex items-center gap-2 rounded-full bg-[var(--lagoon)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
          >
             <Plus size={16} />
             Nouvel opérateur
          </button>
        }
      />

      <div className="content-padding">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : operators.length === 0 ? (
          <div className="island-shell p-8 text-center">
            <UserCog size={40} className="mx-auto mb-3 text-[var(--sea-ink-soft)]" />
            <p className="text-sm text-[var(--sea-ink-soft)]">
              Aucun opérateur trouvé.
            </p>
          </div>
        ) : (
          (() => {
          const OPS_PAGE_SIZE = 15
          const totalPages = Math.ceil(operators.length / OPS_PAGE_SIZE)
          const pagedOps = operators.slice(page * OPS_PAGE_SIZE, (page + 1) * OPS_PAGE_SIZE)
          return (
          <div className="space-y-3">
          <div className="grid gap-3">
            {pagedOps.map((op) => (
              <button
                key={op.id}
                onClick={() => navigate({ to: `/operators/${op.id}` })}
                className="island-shell p-4 hover:shadow-lg transition-all text-left w-full hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--lagoon)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon)] text-white font-bold text-lg">
                    {(op.full_name ?? op.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                        {op.full_name ?? 'Sans nom'}
                      </h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${roleBadge(op.role)}`}>
                        {labelize(op.role)}
                      </span>
                      {op.is_active ? (
                        <span className="rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          Actif
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                          Inactif
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-[var(--sea-ink-soft)]">
                        <Mail size={12} />
                        {op.email}
                      </span>
                      {op.last_login_at && (
                        <span className="flex items-center gap-1 text-xs text-[var(--sea-ink-soft)]">
                          <Calendar size={12} />
                          Dernière connexion: {formatDateTime(op.last_login_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={operators.length}
            pageSize={OPS_PAGE_SIZE}
          />
          </div>
          )
          })()
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="island-shell w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--sea-ink)]">Nouvel opérateur</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
              >
                <X size={20} />
              </button>
            </div>
            {createError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateOperator}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-800 outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
                    placeholder="Ex: ops@pfflab.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-800 outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
                    placeholder="Ex: Agent Admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                    Mot de passe<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-800 outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
                    placeholder="Min. 6 caractères"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                    Rôle<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-800 outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
                  >
                    <option value="intake_operator">Opérateur</option>
                    <option value="intake_manager">Manager</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-medium text-[var(--sea-ink-soft)] hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-full bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lagoon)]/90 disabled:opacity-50"
                >
                  {createLoading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
