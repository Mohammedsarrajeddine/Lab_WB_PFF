import { createFileRoute } from '@tanstack/react-router'
import PageHeader from '../components/layout/PageHeader'
import { Eye, Zap, Puzzle, MessageSquare, HeartPulse, Activity } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  const principles = [
    {
      icon: Eye,
      title: 'Lisibilité',
      value: 'Prioritaire',
      desc: 'Hiérarchie visuelle claire et contrastes stables.',
      color: 'text-sky-600 bg-sky-100/80',
    },
    {
      icon: Zap,
      title: 'Action rapide',
      value: '1 écran',
      desc: 'Décision et mise à jour workflow sans friction.',
      color: 'text-emerald-600 bg-emerald-100/80',
    },
    {
      icon: Puzzle,
      title: 'Cohérence',
      value: 'Design tokens',
      desc: 'Même logique de composants sur tout le produit.',
      color: 'text-amber-600 bg-amber-100/80',
    },
  ]

  const modules = [
    {
      icon: MessageSquare,
      title: 'Intake WhatsApp',
      desc: 'Priorisez les dossiers, mettez à jour les statuts, et clôturez proprement les échanges.',
      tone: 'panel-tint-blue',
      color: 'text-sky-600 bg-sky-100/80',
    },
    {
      icon: HeartPulse,
      title: 'Chatbot RAG',
      desc: 'Offrez des réponses rapides sur les horaires, les documents, et les délais de résultats.',
      tone: 'panel-tint-green',
      color: 'text-emerald-600 bg-emerald-100/80',
    },
    {
      icon: Activity,
      title: 'Supervision',
      desc: 'Vérifiez la santé backend en continu pour sécuriser vos phases de test et de recette.',
      tone: 'panel-tint-warm',
      color: 'text-amber-600 bg-amber-100/80',
    },
  ]

  return (
    <>
      <PageHeader
        kicker="Plateforme"
        title="À propos de la plateforme"
        subtitle="Interface interne pensée pour les opérations terrain du laboratoire."
      />

      <div className="content-padding space-y-5 rise-in">
        {/* Description */}
        <div className="island-shell glass-panel rounded-xl p-5">
          <p className="m-0 max-w-3xl text-sm leading-7 text-[var(--sea-ink-soft)]">
            Cette console unifie la réception des messages patients, le suivi des prescriptions
            et les actions opérateurs dans un flux unique. L'objectif : réduire les allers-retours,
            accélérer les réponses et garder une vision claire sur chaque conversation active.
          </p>
        </div>

        {/* Principles */}
        <div>
          <h2 className="m-0 mb-3 text-sm font-semibold text-[var(--sea-ink)]">Principes de conception</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, value, desc, color }) => (
              <div key={title} className="metric-tile tonal-card flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <span className="text-xs text-[var(--kicker)]">{title}</span>
                  <strong>{value}</strong>
                  <span className="text-xs text-[var(--sea-ink-soft)]">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modules */}
        <div>
          <h2 className="m-0 mb-3 text-sm font-semibold text-[var(--sea-ink)]">Modules disponibles</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {modules.map(({ icon: Icon, title, desc, tone, color }) => (
              <article key={title} className={`tonal-card ${tone} rounded-xl p-4`}>
                <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                  <Icon size={16} />
                </div>
                <h3 className="m-0 text-sm font-semibold text-[var(--sea-ink)]">{title}</h3>
                <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--sea-ink-soft)]">{desc}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="tonal-card panel-tint-blue rounded-xl p-5">
          <h2 className="m-0 mb-3 text-sm font-semibold text-[var(--sea-ink)]">Stack technique</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'React 19', 'TanStack Router', 'Tailwind v4', 'TypeScript',
              'FastAPI', 'PostgreSQL 16', 'pgvector', 'Groq LLM',
              'sentence-transformers', 'Meta WhatsApp API',
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-[var(--line)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sea-ink)]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
