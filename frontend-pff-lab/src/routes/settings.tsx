import { createFileRoute } from '@tanstack/react-router'
import { startTransition, useCallback, useEffect, useState } from 'react'
import {
  fetchCurrentOperator,
  fetchRuntimeSettings,
  fetchRuntimeSettingsStatus,
  getApiErrorMessage,
  getStoredAccessToken,
  patchRuntimeSettings,
} from '../lib/api'
import type {
  OperatorUser,
  RuntimeSettings,
  RuntimeSettingsPatch,
  RuntimeStatusSnapshot,
} from '../lib/api'
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  EyeOff,
  Eye,
  Globe,
  MessageSquare,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { SystemStatusBoard } from '../components/settings/SystemStatusBoard'

export const Route = createFileRoute('/settings')({
  component: AdminSetupPage,
})

/* ------------------------------------------------------------------ */
/*  Field config                                                      */
/* ------------------------------------------------------------------ */

interface FieldDef {
  key: keyof RuntimeSettings
  label: string
  group: string
  icon: typeof SettingsIcon
  sensitive: boolean
  type: 'text' | 'toggle'
  placeholder?: string
  help?: string
}

const FIELDS: FieldDef[] = [
  {
    key: 'whatsapp_access_token',
    label: 'Access Token WhatsApp',
    group: 'WhatsApp Business API',
    icon: MessageSquare,
    sensitive: true,
    type: 'text',
    placeholder: 'EAAVG85xZBrzc...',
    help: 'Token temporaire depuis Meta Developer Dashboard → API Setup',
  },
  {
    key: 'whatsapp_phone_number_id',
    label: 'Phone Number ID',
    group: 'WhatsApp Business API',
    icon: MessageSquare,
    sensitive: false,
    type: 'text',
    placeholder: '1112346865285013',
  },
  {
    key: 'whatsapp_business_account_id',
    label: 'Business Account ID',
    group: 'WhatsApp Business API',
    icon: MessageSquare,
    sensitive: false,
    type: 'text',
    placeholder: '1630917851532772',
  },
  {
    key: 'whatsapp_simulation_mode',
    label: 'Mode simulation',
    group: 'WhatsApp Business API',
    icon: MessageSquare,
    sensitive: false,
    type: 'toggle',
    help: 'Activer pour tester sans envoyer de vrais messages WhatsApp',
  },
  {
    key: 'gemini_api_key',
    label: '🔑 Clé API Gemini (OCR principal)',
    group: 'Intelligence Artificielle',
    icon: Brain,
    sensitive: true,
    type: 'text',
    placeholder: 'sk-or-v1-...',
    help: 'Clé OpenRouter — accès à Gemini 2.0 Flash pour OCR manuscrit (openrouter.ai)',
  },
  {
    key: 'gemini_model',
    label: 'Modèle Gemini',
    group: 'Intelligence Artificielle',
    icon: Brain,
    sensitive: false,
    type: 'text',
    placeholder: 'google/gemini-3-flash-preview',
  },
  {
    key: 'groq_api_key',
    label: 'Clé API Groq (fallback)',
    group: 'Intelligence Artificielle',
    icon: Brain,
    sensitive: true,
    type: 'text',
    placeholder: 'gsk_...',
    help: 'Fallback OCR vision + chatbot. Depuis console.groq.com',
  },
  {
    key: 'groq_model',
    label: 'Modèle chat Groq',
    group: 'Intelligence Artificielle',
    icon: Brain,
    sensitive: false,
    type: 'text',
    placeholder: 'llama-3.3-70b-versatile',
  },
  {
    key: 'groq_vision_model',
    label: 'Modèle vision Groq (fallback)',
    group: 'Intelligence Artificielle',
    icon: Brain,
    sensitive: false,
    type: 'text',
    placeholder: 'meta-llama/llama-4-scout-17b-16e-instruct',
    help: 'Utilisé si Gemini échoue',
  },
  {
    key: 'chatbot_enabled',
    label: 'Chatbot activé',
    group: 'Intelligence Artificielle',
    icon: Brain,
    sensitive: false,
    type: 'toggle',
    help: 'Réponses automatiques aux messages patients',
  },
  {
    key: 'ngrok_authtoken',
    label: 'Ngrok Auth Token',
    group: 'Réseau / Tunnel',
    icon: Globe,
    sensitive: true,
    type: 'text',
    placeholder: '3Bwfb...',
    help: 'Jeton ngrok pour le tunnel webhook Meta',
  },
]

const GROUPS = [...new Set(FIELDS.map((f) => f.group))]

const ADMIN_FIELDS: FieldDef[] = [
  {
    key: 'whatsapp_access_token',
    label: 'WhatsApp access token',
    group: 'WhatsApp Cloud',
    icon: MessageSquare,
    sensitive: true,
    type: 'text',
    placeholder: 'EAAG...',
    help: 'Paste the live Meta token when you want real message delivery.',
  },
  {
    key: 'whatsapp_phone_number_id',
    label: 'Phone number ID',
    group: 'WhatsApp Cloud',
    icon: MessageSquare,
    sensitive: false,
    type: 'text',
    placeholder: '1112346865285013',
  },
  {
    key: 'whatsapp_business_account_id',
    label: 'Business account ID',
    group: 'WhatsApp Cloud',
    icon: MessageSquare,
    sensitive: false,
    type: 'text',
    placeholder: '1630917851532772',
  },
  {
    key: 'whatsapp_simulation_mode',
    label: 'Simulation mode',
    group: 'WhatsApp Cloud',
    icon: MessageSquare,
    sensitive: false,
    type: 'toggle',
    help: 'Use local simulation when you want to test the workflow without sending live WhatsApp traffic.',
  },
  {
    key: 'gemini_api_key',
    label: 'OpenRouter API key',
    group: 'AI Runtime',
    icon: Brain,
    sensitive: true,
    type: 'text',
    placeholder: 'sk-or-v1-...',
    help: 'Gemini runs through OpenRouter and powers the primary OCR path.',
  },
  {
    key: 'gemini_model',
    label: 'Gemini model',
    group: 'AI Runtime',
    icon: Brain,
    sensitive: false,
    type: 'text',
    placeholder: 'google/gemini-3-flash-preview',
  },
  {
    key: 'groq_api_key',
    label: 'Groq API key',
    group: 'AI Runtime',
    icon: Sparkles,
    sensitive: true,
    type: 'text',
    placeholder: 'gsk_...',
    help: 'Groq powers the chatbot and fallback vision runtime.',
  },
  {
    key: 'groq_model',
    label: 'Groq chat model',
    group: 'AI Runtime',
    icon: Sparkles,
    sensitive: false,
    type: 'text',
    placeholder: 'llama-3.3-70b-versatile',
  },
  {
    key: 'groq_vision_model',
    label: 'Groq vision model',
    group: 'AI Runtime',
    icon: Sparkles,
    sensitive: false,
    type: 'text',
    placeholder: 'meta-llama/llama-4-scout-17b-16e-instruct',
    help: 'Used when the primary OCR path needs a fallback.',
  },
  {
    key: 'chatbot_enabled',
    label: 'Chatbot enabled',
    group: 'AI Runtime',
    icon: Sparkles,
    sensitive: false,
    type: 'toggle',
    help: 'Controls whether the assistant can answer patients automatically.',
  },
  {
    key: 'ngrok_authtoken',
    label: 'ngrok auth token',
    group: 'Tunnel and webhooks',
    icon: Globe,
    sensitive: true,
    type: 'text',
    placeholder: '3Bwfb...',
    help: 'Used when you want a public webhook tunnel from the local stack.',
  },
]

const ADMIN_GROUPS = [...new Set(ADMIN_FIELDS.map((field) => field.group))]

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SettingsPage() {
  const [operator, setOperator] = useState<OperatorUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [settings, setSettings] = useState<RuntimeSettings | null>(null)
  const [edits, setEdits] = useState<RuntimeSettingsPatch>({})
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Auth check
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

  // Fetch settings once we know user is admin
  useEffect(() => {
    if (!authChecked || !operator) return
    if (operator.role !== 'admin') {
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    fetchRuntimeSettings(ctrl.signal)
      .then((s) => {
        setSettings(s)
        setLoading(false)
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setError(getApiErrorMessage(e))
          setLoading(false)
        }
      })
    return () => ctrl.abort()
  }, [authChecked, operator])

  const handleChange = useCallback(
    (key: keyof RuntimeSettings, value: string | boolean) => {
      setEdits((prev) => ({ ...prev, [key]: value }))
      setSuccess(null)
    },
    [],
  )

  const toggleReveal = useCallback((key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    const patchKeys = Object.keys(edits).filter(
      (k) => edits[k as keyof RuntimeSettingsPatch] !== undefined,
    )
    if (patchKeys.length === 0) return

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await patchRuntimeSettings(edits)
      setSettings(updated)
      setEdits({})
      setSuccess(`${patchKeys.length} paramètre(s) mis à jour avec succès.`)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [edits])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await fetchRuntimeSettings()
      setSettings(s)
      setEdits({})
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const dirtyCount = Object.keys(edits).filter(
    (k) => edits[k as keyof RuntimeSettingsPatch] !== undefined,
  ).length

  // ---- Render ----

  if (!authChecked || loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <RefreshCw className="animate-spin text-[var(--sea-mid)]" size={28} />
      </div>
    )
  }

  if (!operator) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center shadow-sm">
          <ShieldCheck size={40} className="mx-auto mb-3 text-[var(--danger)]" />
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">Connexion requise</h2>
          <p className="mt-1 text-sm text-[var(--sea-body)]">
            Veuillez vous connecter en tant qu'administrateur.
          </p>
        </div>
      </div>
    )
  }

  if (operator.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center shadow-sm">
          <ShieldCheck size={40} className="mx-auto mb-3 text-[var(--warning)]" />
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">Accès réservé</h2>
          <p className="mt-1 text-sm text-[var(--sea-body)]">
            Seuls les administrateurs peuvent modifier les paramètres système.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sea-mid)] text-white">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--sea-ink)]">Paramètres système</h1>
            <p className="text-xs text-[var(--sea-body)]">
              Mise à jour en temps réel — aucun rebuild Docker nécessaire
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--sea-body)] transition hover:bg-[var(--surface-hover)]"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* Groups */}
      {GROUPS.map((group) => {
        const groupFields = FIELDS.filter((f) => f.group === group)
        const GroupIcon = groupFields[0].icon

        return (
          <section
            key={group}
            className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-sm"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
              <GroupIcon size={16} className="text-[var(--sea-mid)]" />
              <h2 className="text-sm font-semibold text-[var(--sea-ink)]">{group}</h2>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {groupFields.map((field) => {
                const current =
                  edits[field.key] !== undefined
                    ? edits[field.key]
                    : settings?.[field.key]

                if (field.type === 'toggle') {
                  const checked =
                    edits[field.key] !== undefined
                      ? Boolean(edits[field.key])
                      : Boolean(settings?.[field.key])

                  return (
                    <div key={field.key} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <label className="text-sm font-medium text-[var(--sea-ink)]">
                          {field.label}
                        </label>
                        {field.help && (
                          <p className="mt-0.5 text-xs text-[var(--sea-body)]">{field.help}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => handleChange(field.key, !checked)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          checked ? 'bg-[var(--sea-mid)]' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                            checked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )
                }

                const isRevealed = revealed.has(field.key)
                const displayValue = field.sensitive && !isRevealed
                  ? String(current ?? '')
                  : String(current ?? '')

                return (
                  <div key={field.key} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-[var(--sea-ink)]">
                        {field.label}
                      </label>
                      {field.sensitive && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(field.key)}
                          className="flex items-center gap-1 text-xs text-[var(--sea-body)] hover:text-[var(--sea-ink)]"
                        >
                          {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          {isRevealed ? 'Masquer' : 'Voir'}
                        </button>
                      )}
                    </div>
                    {field.help && (
                      <p className="mt-0.5 text-xs text-[var(--sea-body)]">{field.help}</p>
                    )}
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type={field.sensitive && !isRevealed ? 'password' : 'text'}
                        value={
                          edits[field.key] !== undefined
                            ? String(edits[field.key])
                            : ''
                        }
                        placeholder={displayValue || field.placeholder}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-body)]/50 focus:border-[var(--sea-mid)] focus:outline-none focus:ring-1 focus:ring-[var(--sea-mid)]"
                      />
                    </div>
                    {edits[field.key] !== undefined && (
                      <p className="mt-1 text-xs font-medium text-[var(--sea-mid)]">
                        ● Modification en attente
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3 shadow-lg">
        <span className="text-sm text-[var(--sea-body)]">
          {dirtyCount > 0
            ? `${dirtyCount} modification(s) en attente`
            : 'Aucune modification'}
        </span>
        <button
          type="button"
          disabled={dirtyCount === 0 || saving}
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-[var(--sea-mid)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--sea-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  )
}

function AdminSetupPage() {
  const [operator, setOperator] = useState<OperatorUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [settings, setSettings] = useState<RuntimeSettings | null>(null)
  const [statusSnapshot, setStatusSnapshot] = useState<RuntimeStatusSnapshot | null>(null)
  const [edits, setEdits] = useState<RuntimeSettingsPatch>({})
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const token = getStoredAccessToken()
    if (!token) {
      setAuthChecked(true)
      setLoading(false)
      return
    }

    fetchCurrentOperator()
      .then((currentOperator) => {
        startTransition(() => {
          setOperator(currentOperator)
          setAuthChecked(true)
        })
      })
      .catch(() => {
        startTransition(() => {
          setAuthChecked(true)
          setLoading(false)
        })
      })
  }, [])

  const loadAdminSetup = useCallback(
    async (signal?: AbortSignal, mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      try {
        const [runtimeSettings, runtimeStatus] = await Promise.all([
          fetchRuntimeSettings(signal),
          fetchRuntimeSettingsStatus(signal),
        ])

        startTransition(() => {
          setSettings(runtimeSettings)
          setStatusSnapshot(runtimeStatus)
          if (mode === 'refresh') {
            setEdits({})
          }
        })
      } catch (requestError) {
        if (!signal?.aborted) {
          setError(getApiErrorMessage(requestError))
        }
      } finally {
        if (!signal?.aborted) {
          if (mode === 'initial') {
            setLoading(false)
          } else {
            setRefreshing(false)
          }
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (!authChecked || !operator) {
      return
    }
    if (operator.role !== 'admin') {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    void loadAdminSetup(controller.signal)
    return () => controller.abort()
  }, [authChecked, loadAdminSetup, operator])

  const handleChange = useCallback(
    (key: keyof RuntimeSettings, value: string | boolean) => {
      setEdits((previous) => ({ ...previous, [key]: value }))
      setSuccess(null)
    },
    [],
  )

  const toggleReveal = useCallback((key: string) => {
    setRevealed((previous) => {
      const next = new Set(previous)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    await loadAdminSetup(undefined, 'refresh')
  }, [loadAdminSetup])

  const handleSave = useCallback(async () => {
    const patchKeys = Object.keys(edits).filter(
      (key) => edits[key as keyof RuntimeSettingsPatch] !== undefined,
    )
    if (patchKeys.length === 0) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updatedSettings = await patchRuntimeSettings(edits)
      const runtimeStatus = await fetchRuntimeSettingsStatus()

      startTransition(() => {
        setSettings(updatedSettings)
        setStatusSnapshot(runtimeStatus)
        setEdits({})
        setSuccess(`${patchKeys.length} runtime setting(s) saved.`)
      })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }, [edits])

  const dirtyCount = Object.keys(edits).filter(
    (key) => edits[key as keyof RuntimeSettingsPatch] !== undefined,
  ).length

  if (!authChecked || loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <RefreshCw className="animate-spin text-[var(--lagoon)]" size={28} />
      </div>
    )
  }

  if (!operator) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="glass-panel max-w-md rounded-[1.2rem] p-8 text-center shadow-sm">
          <ShieldCheck size={40} className="mx-auto mb-3 text-[var(--danger)]" />
          <h2 className="font-[var(--font-headline)] text-xl font-bold text-[var(--sea-ink)]">
            Sign in required
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
            You need an admin session before editing runtime credentials and connection settings.
          </p>
        </div>
      </div>
    )
  }

  if (operator.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="glass-panel max-w-md rounded-[1.2rem] p-8 text-center shadow-sm">
          <ShieldCheck size={40} className="mx-auto mb-3 text-[var(--warning)]" />
          <h2 className="font-[var(--font-headline)] text-xl font-bold text-[var(--sea-ink)]">
            Admin access only
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
            This setup surface is restricted to administrators because it controls live runtime credentials.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 xl:px-8">
      <header className="rise-in mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="island-kicker">Admin Setup</p>
          <h1 className="mt-2 font-[var(--font-headline)] text-[1.9rem] font-extrabold tracking-[-0.02em] text-[var(--sea-ink)]">
            Runtime keys, tunnels, and workflow health in one control surface.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
            Edit live credentials, watch each dependency state, and spot broken workflow paths before they reach operators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="status-pill">
            <span className="status-dot" />
            Live updates, no Docker rebuild
          </div>
          <button type="button" onClick={() => void handleRefresh()} className="btn-secondary">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh status
          </button>
        </div>
      </header>

      {error && (
        <div
          className="mb-4 rounded-2xl border px-4 py-3 text-sm"
          style={{
            color: 'var(--danger)',
            borderColor: 'color-mix(in oklab, var(--danger) 28%, var(--line))',
            background:
              'color-mix(in oklab, var(--danger) 8%, var(--surface) 92%)',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-4 rounded-2xl border px-4 py-3 text-sm"
          style={{
            color: 'var(--success)',
            borderColor: 'color-mix(in oklab, var(--success) 28%, var(--line))',
            background:
              'color-mix(in oklab, var(--success) 8%, var(--surface) 92%)',
          }}
        >
          {success}
        </div>
      )}

      <SystemStatusBoard
        snapshot={statusSnapshot}
        refreshing={refreshing}
        onRefresh={() => {
          void handleRefresh()
        }}
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {ADMIN_GROUPS.map((group) => {
            const groupFields = ADMIN_FIELDS.filter((field) => field.group === group)
            const GroupIcon = groupFields[0].icon

            return (
              <section
                key={group}
                className="glass-panel rounded-[1.35rem] border p-5 shadow-sm"
              >
                <div className="mb-5 flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border text-[var(--lagoon)]"
                    style={{
                      borderColor: 'var(--line)',
                      background:
                        'color-mix(in oklab, var(--lagoon) 10%, var(--surface) 90%)',
                    }}
                  >
                    <GroupIcon size={18} />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-headline)] text-lg font-bold text-[var(--sea-ink)]">
                      {group}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                      Update the values that drive this part of the workflow.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {groupFields.map((field) => {
                    if (field.type === 'toggle') {
                      const checked =
                        edits[field.key] !== undefined
                          ? Boolean(edits[field.key])
                          : Boolean(settings?.[field.key])

                      return (
                        <div
                          key={field.key}
                          className="rounded-[1.1rem] border p-4"
                          style={{
                            borderColor: 'var(--line)',
                            background:
                              'color-mix(in oklab, var(--surface) 92%, white 8%)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="max-w-xl">
                              <label className="text-sm font-semibold text-[var(--sea-ink)]">
                                {field.label}
                              </label>
                              {field.help && (
                                <p className="mt-1 text-sm leading-6 text-[var(--sea-ink-soft)]">
                                  {field.help}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={checked}
                              onClick={() => handleChange(field.key, !checked)}
                              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition ${
                                checked
                                  ? 'border-[var(--lagoon)] bg-[var(--lagoon)]'
                                  : 'border-[var(--line-strong)] bg-[var(--sand)]'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 translate-y-[3px] rounded-full bg-white shadow-sm transition ${
                                  checked ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      )
                    }

                    const currentValue = settings?.[field.key]
                    const isRevealed = revealed.has(field.key)
                    const maskedPlaceholder =
                      typeof currentValue === 'string' && currentValue
                        ? currentValue
                        : field.placeholder

                    return (
                      <div
                        key={field.key}
                        className="rounded-[1.1rem] border p-4"
                        style={{
                          borderColor: 'var(--line)',
                          background:
                            'color-mix(in oklab, var(--surface) 92%, white 8%)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="max-w-xl">
                            <label className="text-sm font-semibold text-[var(--sea-ink)]">
                              {field.label}
                            </label>
                            {field.help && (
                              <p className="mt-1 text-sm leading-6 text-[var(--sea-ink-soft)]">
                                {field.help}
                              </p>
                            )}
                          </div>

                          {field.sensitive && (
                            <button
                              type="button"
                              onClick={() => toggleReveal(field.key)}
                              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                            >
                              {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                              {isRevealed ? 'Hide' : 'Reveal'}
                            </button>
                          )}
                        </div>

                        <div className="mt-4">
                          <input
                            type={field.sensitive && !isRevealed ? 'password' : 'text'}
                            value={
                              edits[field.key] !== undefined ? String(edits[field.key]) : ''
                            }
                            placeholder={maskedPlaceholder}
                            onChange={(event) => handleChange(field.key, event.target.value)}
                            className="field-shell"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--sea-ink-soft)]">
                          <span className="status-pill">
                            <span className="status-dot" />
                            Leave blank to keep the current value
                          </span>
                          {edits[field.key] !== undefined && (
                            <span className="status-pill">
                              <span
                                className="status-dot"
                                style={{ background: 'var(--warning)' }}
                              />
                              Pending update
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="feature-card rounded-[1.35rem] border p-5">
            <p className="island-kicker">Change Summary</p>
            <h2 className="mt-3 font-[var(--font-headline)] text-xl font-bold text-[var(--sea-ink)]">
              Save only when the runtime should really change.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
              Source edits do not require a rebuild. This page updates the running backend and then refreshes the status board immediately.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="metric-tile">
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--sea-ink-soft)]">
                  Pending changes
                </span>
                <strong>{dirtyCount}</strong>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                disabled={dirtyCount === 0 || saving}
                onClick={() => {
                  void handleSave()
                }}
                className="btn-primary"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Save runtime settings
              </button>

              <button
                type="button"
                disabled={refreshing}
                onClick={() => {
                  void handleRefresh()
                }}
                className="btn-secondary"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                Reload board
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-[1.35rem] border p-5">
            <p className="island-kicker">Operator Notes</p>
            <h2 className="mt-3 font-[var(--font-headline)] text-lg font-bold text-[var(--sea-ink)]">
              Recommended flow
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
              <p>1. Fill the missing credentials for the service you want to activate.</p>
              <p>2. Save the runtime settings and watch the board refresh itself.</p>
              <p>3. Keep an eye on yellow states. They usually mean preview models, partial config, or a workflow fallback.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
