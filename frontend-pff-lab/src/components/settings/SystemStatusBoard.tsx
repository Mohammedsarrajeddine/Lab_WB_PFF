import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  RefreshCw,
  ScanLine,
  Sparkles,
  XCircle,
  MessageSquare,
} from 'lucide-react'

import type { RuntimeDependencyStatus, RuntimeStatusSnapshot } from '../../lib/api'

interface SystemStatusBoardProps {
  snapshot: RuntimeStatusSnapshot | null
  refreshing: boolean
  onRefresh: () => void
}

type ToneKey = RuntimeDependencyStatus['tone']

const SERVICE_ICONS: Record<string, LucideIcon> = {
  database: Database,
  whatsapp: MessageSquare,
  gemini: Sparkles,
  groq: Cpu,
  ngrok: Globe,
  ocr_pipeline: ScanLine,
  chatbot_workflow: Bot,
}

const TONE_STYLES: Record<
  ToneKey,
  {
    accent: string
    surface: string
    badge: string
    border: string
  }
> = {
  success: {
    accent: 'var(--success)',
    surface: 'color-mix(in oklab, var(--success) 10%, var(--surface) 90%)',
    badge: 'color-mix(in oklab, var(--success) 14%, var(--surface) 86%)',
    border: 'color-mix(in oklab, var(--success) 26%, var(--line))',
  },
  warning: {
    accent: 'var(--warning)',
    surface: 'color-mix(in oklab, var(--warning) 10%, var(--surface) 90%)',
    badge: 'color-mix(in oklab, var(--warning) 14%, var(--surface) 86%)',
    border: 'color-mix(in oklab, var(--warning) 26%, var(--line))',
  },
  danger: {
    accent: 'var(--danger)',
    surface: 'color-mix(in oklab, var(--danger) 9%, var(--surface) 91%)',
    badge: 'color-mix(in oklab, var(--danger) 14%, var(--surface) 86%)',
    border: 'color-mix(in oklab, var(--danger) 26%, var(--line))',
  },
  info: {
    accent: 'var(--lagoon)',
    surface: 'color-mix(in oklab, var(--lagoon) 10%, var(--surface) 90%)',
    badge: 'color-mix(in oklab, var(--lagoon) 14%, var(--surface) 86%)',
    border: 'color-mix(in oklab, var(--lagoon) 26%, var(--line))',
  },
  neutral: {
    accent: 'var(--sea-ink-soft)',
    surface: 'color-mix(in oklab, var(--sea-ink-soft) 8%, var(--surface) 92%)',
    badge: 'color-mix(in oklab, var(--sea-ink-soft) 10%, var(--surface) 90%)',
    border: 'color-mix(in oklab, var(--sea-ink-soft) 20%, var(--line))',
  },
}

const OVERALL_COPY: Record<
  RuntimeStatusSnapshot['overall_status'],
  {
    label: string
    description: string
    tone: ToneKey
    icon: LucideIcon
  }
> = {
  healthy: {
    label: 'Operational',
    description: 'Core services are ready for the live workflow.',
    tone: 'success',
    icon: CheckCircle2,
  },
  degraded: {
    label: 'Needs Attention',
    description: 'At least one service is missing, in preview, or partially configured.',
    tone: 'warning',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Workflow Blocked',
    description: 'A required service is down, so key admin workflows are not safe to trust.',
    tone: 'danger',
    icon: XCircle,
  },
}

function formatCheckedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function renderMetadataEntries(metadata: Record<string, string>): [string, string][] {
  return Object.entries(metadata)
    .filter(([, value]) => value && value !== '(not configured)')
    .slice(0, 3)
}

function statusLabel(status: RuntimeDependencyStatus['status']): string {
  switch (status) {
    case 'connected':
      return 'Connected'
    case 'attention':
      return 'Attention'
    case 'disconnected':
      return 'Disconnected'
    case 'missing':
      return 'Missing'
    case 'simulation':
      return 'Simulation'
    default:
      return status
  }
}

function toneStyle(tone: ToneKey): CSSProperties {
  const style = TONE_STYLES[tone]
  return {
    borderColor: style.border,
    background: style.surface,
  }
}

function badgeStyle(tone: ToneKey): CSSProperties {
  const style = TONE_STYLES[tone]
  return {
    color: style.accent,
    background: style.badge,
    borderColor: style.border,
  }
}

function dotStyle(tone: ToneKey): CSSProperties {
  return {
    background: TONE_STYLES[tone].accent,
  }
}

export function SystemStatusBoard({
  snapshot,
  refreshing,
  onRefresh,
}: SystemStatusBoardProps) {
  if (!snapshot) {
    return (
      <section className="rise-in rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="island-kicker">Runtime Observability</p>
            <h2 className="mt-2 font-[var(--font-headline)] text-[1.35rem] font-extrabold text-[var(--sea-ink)]">
              Admin setup status board
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
              The admin system snapshot has not loaded yet.
            </p>
          </div>
          <button type="button" onClick={onRefresh} className="btn-secondary">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Retry
          </button>
        </div>
      </section>
    )
  }

  const overall = OVERALL_COPY[snapshot.overall_status]
  const OverallIcon = overall.icon

  return (
    <section className="rise-in space-y-4">
      <div className="hero-split">
        <div
          className="feature-card relative overflow-hidden rounded-[1.5rem] border p-6"
          style={{
            ...toneStyle(overall.tone),
            backgroundImage:
              'radial-gradient(circle at top right, color-mix(in oklab, var(--lagoon) 18%, transparent) 0, transparent 38%), linear-gradient(155deg, color-mix(in oklab, var(--surface) 92%, white 8%), var(--surface))',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-[color:var(--inset-glint)]" />
          <p className="island-kicker">Runtime Observability</p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={badgeStyle(overall.tone)}
              >
                <OverallIcon size={14} />
                {overall.label}
              </div>
              <h2 className="mt-4 font-[var(--font-headline)] text-[1.5rem] font-extrabold leading-tight text-[var(--sea-ink)] sm:text-[1.85rem]">
                Monitor every key dependency before the workflow hits a dead end.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
                {overall.description} This board maps credentials, connections, and
                workflow readiness directly to your admin setup surface.
              </p>
            </div>

            <button type="button" onClick={onRefresh} className="btn-secondary whitespace-nowrap">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <aside className="glass-panel flex flex-col justify-between rounded-[1.4rem] border p-5">
          <div>
            <p className="island-kicker">Snapshot</p>
            <p className="mt-3 text-sm text-[var(--sea-ink-soft)]">
              Last checked
            </p>
            <p className="mt-1 font-[var(--font-headline)] text-lg font-bold text-[var(--sea-ink)]">
              {formatCheckedAt(snapshot.checked_at)}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="metric-tile">
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--sea-ink-soft)]">
                Healthy
              </span>
              <strong>{snapshot.connected_count}</strong>
            </div>
            <div className="metric-tile">
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--sea-ink-soft)]">
                Watch
              </span>
              <strong>{snapshot.attention_count}</strong>
            </div>
            <div className="metric-tile">
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--sea-ink-soft)]">
                Blocked
              </span>
              <strong>{snapshot.disconnected_count}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {snapshot.services.map((service) => {
          const Icon = SERVICE_ICONS[service.key] ?? Activity
          const metadataEntries = renderMetadataEntries(service.metadata)

          return (
            <article
              key={service.key}
              className="rounded-[1.25rem] border p-4 shadow-sm"
              style={toneStyle(service.tone)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={badgeStyle(service.tone)}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-[var(--font-headline)] text-base font-bold text-[var(--sea-ink)]">
                      {service.label}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--sea-ink-soft)]">
                      {service.workflow_role}
                    </p>
                  </div>
                </div>

                <div
                  className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold"
                  style={badgeStyle(service.tone)}
                >
                  <span className="h-2 w-2 rounded-full" style={dotStyle(service.tone)} />
                  {statusLabel(service.status)}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--sea-ink-soft)]">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1"
                  style={badgeStyle(service.configured ? service.tone : 'neutral')}
                >
                  {service.configured ? 'Configured' : 'Needs setup'}
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold leading-6 text-[var(--sea-ink)]">
                {service.summary}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                {service.detail}
              </p>

              {metadataEntries.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {metadataEntries.map(([key, value]) => (
                    <span
                      key={`${service.key}-${key}`}
                      className="inline-flex max-w-full items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[0.72rem] text-[var(--sea-ink-soft)]"
                      title={`${key}: ${value}`}
                    >
                      <span className="mr-1.5 font-semibold text-[var(--sea-ink)]">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="truncate">{value}</span>
                    </span>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
