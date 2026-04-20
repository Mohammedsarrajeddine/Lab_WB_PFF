import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchPatients,
  createPatient,
  getApiErrorMessage,
  getStoredAccessToken,
  fetchCurrentOperator,
} from '../lib/api'
import type { PatientItem, OperatorUser } from '../lib/api'
import PageHeader from '../components/layout/PageHeader'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  Clock,
  ShieldCheck,
  Plus,
  X,
} from 'lucide-react'
import { formatDateTime } from '../components/intake/utils'

export const Route = createFileRoute('/patients/')({
  component: PatientsPage,
})

function PatientsPage() {
  const [operator, setOperator] = useState<OperatorUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createPhone, setCreatePhone] = useState('')
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

  const loadPatients = useCallback(
    async (searchTerm: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchPatients({ search: searchTerm || undefined })
        setPatients(res.items)
        setTotal(res.total)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!authChecked || !operator || operator.role !== 'admin') return
    void loadPatients(search)
  }, [authChecked, operator, search, loadPatients])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const PATIENTS_PAGE_SIZE = 15
  const totalPages = Math.ceil(patients.length / PATIENTS_PAGE_SIZE)
  const pagedPatients = patients.slice(page * PATIENTS_PAGE_SIZE, (page + 1) * PATIENTS_PAGE_SIZE)

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createPhone) {
      setCreateError('Le numéro de téléphone est requis')
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    try {
      const newPatient = await createPatient({ full_name: createName, phone_e164: createPhone })
      setPatients([newPatient, ...patients])
      setTotal(t => t + 1)
      setIsCreateModalOpen(false)
      setCreateName('')
      setCreatePhone('')
    } catch (error) {
      setCreateError(getApiErrorMessage(error))
    } finally {
      setCreateLoading(false)
    }
  }

  if (!authChecked || (loading && !patients.length)) {
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

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="Gestion des patients"
        subtitle={`${total} patient(s) enregistré(s)`}
        actions={
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-[var(--link-bg-hover)] px-3 py-1.5">
                <Search size={14} className="text-[var(--sea-ink-soft)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher un patient…"
                  className="bg-transparent text-sm outline-none text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] w-48"
                />
              </div>
            </form>
            <button
               onClick={() => setIsCreateModalOpen(true)}
               className="flex items-center gap-2 rounded-full bg-[var(--lagoon)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
            >
               <Plus size={16} />
               Nouveau patient
            </button>
          </div>
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
        ) : patients.length === 0 ? (
          <div className="island-shell p-8 text-center">
            <Users size={40} className="mx-auto mb-3 text-[var(--sea-ink-soft)]" />
            <p className="text-sm text-[var(--sea-ink-soft)]">
              Aucun patient trouvé.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
          <div className="grid gap-3">
            {pagedPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => {
                   navigate({ to: `/patients/${patient.id}` })
                }}
                className="island-shell p-4 hover:shadow-lg transition-all text-left w-full hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--lagoon)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon)] text-white font-bold text-lg">
                    {(patient.full_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                      {patient.full_name ?? 'Patient inconnu'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-[var(--sea-ink-soft)]">
                        <Phone size={12} />
                        {patient.phone_e164}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--sea-ink-soft)]">
                        <MessageSquare size={12} />
                        {patient.conversation_count} conversation(s)
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--sea-ink-soft)]">
                        <Clock size={12} />
                        {formatDateTime(patient.last_message_at)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--sea-ink-soft)]">
                    Créé {formatDateTime(patient.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={patients.length}
            pageSize={PATIENTS_PAGE_SIZE}
          />
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="island-shell w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--sea-ink)]">Nouveau patient</h2>
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
            <form onSubmit={handleCreatePatient}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-800 outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                    Téléphone (e164)<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-800 outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
                    placeholder="Ex: +212600000000"
                  />
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
