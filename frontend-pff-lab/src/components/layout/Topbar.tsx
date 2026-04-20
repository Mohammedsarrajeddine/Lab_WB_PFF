import { useMatches } from '@tanstack/react-router'
import { Menu, Search } from 'lucide-react'
import type { OperatorUser } from '../../lib/api'
import { labelize } from '../intake/utils'
import NotificationBell from './NotificationBell'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
  '/intake': 'Bureau d\'accueil',
  '/chat': 'Assistant IA',
  '/patients': 'Patients',
  '/operators': 'Opérateurs',
  '/analyses': 'Analyses',
  '/settings': 'Paramètres',
  '/about': 'Plateforme',
}

interface TopbarProps {
  onOpenMobileSidebar: () => void
  operator: OperatorUser | null
  onLogout: () => void
}

export default function Topbar({
  onOpenMobileSidebar,
  operator,
  onLogout,
}: TopbarProps) {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? '/'
  const pageTitle = ROUTE_TITLES[currentPath] ?? 'PFF Lab'

  const initials = operator
    ? (operator.full_name ?? operator.email)
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?'

  return (
    <div className="topbar">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="topbar__hamburger"
        onClick={onOpenMobileSidebar}
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="topbar__breadcrumb">
        <span className="hidden md:inline island-kicker">Console</span>
        <span className="topbar__breadcrumb-page">{pageTitle}</span>
      </div>

      <div className="topbar__search" aria-hidden="true">
        <Search size={15} />
        <input
          type="text"
          placeholder="Rechercher patient, conversation, analyse…"
          tabIndex={-1}
          readOnly
        />
      </div>

      <div className="topbar__spacer" />

      {/* Actions */}
      <div className="topbar__actions">
        <NotificationBell />

        {/* User chip */}
        {operator ? (
          <div className="relative group">
            <button
              type="button"
              className="topbar__user-chip"
              aria-label="Menu utilisateur"
            >
              <span className="topbar__user-avatar">{initials}</span>
              <span className="topbar__user-info">
                <span className="topbar__user-name">
                  {operator.full_name ?? operator.email}
                </span>
                <span className="topbar__user-role">
                  {labelize(operator.role)}
                </span>
              </span>
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block">
              <div className="island-shell rounded-xl p-1 min-w-[160px] shadow-[0_12px_32px_rgba(16,38,56,0.16)]">
                <div className="px-3 py-2 border-b border-[var(--line)]">
                  <p className="m-0 text-xs font-semibold text-[var(--sea-ink)]">
                    {operator.full_name ?? operator.email}
                  </p>
                  <p className="m-0 text-[0.625rem] text-[var(--sea-ink-soft)]">
                    {operator.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50/60 rounded-lg transition-colors"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
