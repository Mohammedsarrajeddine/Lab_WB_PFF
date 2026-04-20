import type { AnalysisRequestStatus, ConversationStatus } from '../../lib/api'

const FRENCH_LABEL_OVERRIDES: Record<string, string> = {
  open: 'Ouverte',
  pending_review: 'En attente de revue',
  prepared: 'Préparée',
  closed: 'Clôturée',
  received: 'Reçue',
  prescription_received: 'Ordonnance reçue',
  in_review: 'En revue',
  intake_operator: 'Opérateur de saisie',
  intake_manager: 'Responsable de saisie',
  admin: 'Administrateur',
  outgoing: 'Sortant',
  incoming: 'Entrant',
  text: 'Texte',
  image: 'Image',
  document: 'Document',
  audio: 'Audio',
}

/** Turn snake_case or lower strings into Title Case labels. */
export function labelize(value: string): string {
  const normalized = value.trim().toLowerCase()
  const frenchLabel = FRENCH_LABEL_OVERRIDES[normalized]
  if (frenchLabel) {
    return frenchLabel
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Format a datetime string for display. */
export function formatDateTime(value: string | null): string {
  if (!value) return '–'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return date.toLocaleString()
}

/** Status badge colour classes. */
export function statusTone(status: ConversationStatus): string {
  switch (status) {
    case 'open':
      return 'border-sky-300/70 bg-sky-100/70 text-sky-800'
    case 'pending_review':
      return 'border-amber-300/80 bg-amber-100/65 text-amber-900'
    case 'prepared':
      return 'border-emerald-300/80 bg-emerald-100/65 text-emerald-800'
    case 'closed':
      return 'border-slate-300/80 bg-slate-100/80 text-slate-700'
    default:
      return 'border-[var(--line)] bg-white/70 text-[var(--sea-ink-soft)]'
  }
}

export function analysisStatusTone(status: AnalysisRequestStatus): string {
  switch (status) {
    case 'received':
      return 'border-cyan-300/70 bg-cyan-100/70 text-cyan-800'
    case 'prescription_received':
      return 'border-indigo-300/70 bg-indigo-100/70 text-indigo-800'
    case 'in_review':
      return 'border-amber-300/80 bg-amber-100/65 text-amber-900'
    case 'prepared':
      return 'border-emerald-300/80 bg-emerald-100/65 text-emerald-800'
    default:
      return 'border-[var(--line)] bg-white/70 text-[var(--sea-ink-soft)]'
  }
}
