import { Link, useMatches } from '@tanstack/react-router'
import {
  LayoutDashboard,
  MessageSquareText,
  Inbox,
  Info,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Moon,
  Sun,
  Monitor,
  Users,
  UserCog,
  FlaskConical,
} from 'lucide-react'
import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return 'auto'
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)
  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
  document.documentElement.style.colorScheme = resolved
}

const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { to: '/' as const, label: 'Tableau de bord', icon: LayoutDashboard },
      { to: '/intake' as const, label: 'Bureau d\'accueil', icon: Inbox },
      { to: '/chat' as const, label: 'Assistant IA', icon: MessageSquareText },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/patients' as const, label: 'Patients', icon: Users },
      { to: '/operators' as const, label: 'Opérateurs', icon: UserCog },
      { to: '/analyses' as const, label: 'Analyses', icon: FlaskConical },
    ],
  },
  {
    section: 'Système',
    items: [
      { to: '/settings' as const, label: 'Paramètres', icon: Settings },
      { to: '/about' as const, label: 'Plateforme', icon: Info },
    ],
  },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? '/'

  const [themeMode, setThemeMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initial = getInitialTheme()
    setThemeMode(initial)
    applyThemeMode(initial)
  }, [])

  useEffect(() => {
    if (themeMode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [themeMode])

  function cycleTheme() {
    const next: ThemeMode =
      themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'auto' : 'light'
    setThemeMode(next)
    applyThemeMode(next)
    window.localStorage.setItem('theme', next)
  }

  const ThemeIcon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Monitor

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="sidebar-backdrop"
        data-visible={isMobileOpen}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className="sidebar"
        data-mobile-open={isMobileOpen}
        style={{ width: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
      >
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">PFF</div>
          {!isCollapsed && (
            <div className="sidebar__brand-text">
              <span className="text-[0.5625rem] font-extrabold uppercase tracking-[0.16em] text-[var(--kicker)]">
                PFF Lab
              </span>
              <span className="text-[0.875rem] font-semibold text-[var(--sea-ink)] [font-family:var(--font-headline)]">
                Console
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav" aria-label="Navigation principale">
          {NAV_ITEMS.map((section) => (
            <div key={section.section} className="mb-1">
              {!isCollapsed && (
                <div className="sidebar__section-label">{section.section}</div>
              )}
              {section.items.map((item) => {
                const isActive = currentPath === item.to
                const Icon = item.icon

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar__nav-item ${isActive ? 'is-active' : ''}`}
                    onClick={onCloseMobile}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar__nav-icon">
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    </span>
                    {!isCollapsed && (
                      <span className="sidebar__nav-label">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="sidebar__nav-item"
            title={isCollapsed ? 'API Docs' : undefined}
          >
            <span className="sidebar__nav-icon">
              <ExternalLink size={16} strokeWidth={1.8} />
            </span>
            {!isCollapsed && (
              <span className="sidebar__nav-label">API Docs</span>
            )}
          </a>

          <button
            type="button"
            onClick={cycleTheme}
            className="sidebar__nav-item"
            title={`Thème : ${themeMode === 'auto' ? 'Auto' : themeMode === 'dark' ? 'Sombre' : 'Clair'}`}
          >
            <span className="sidebar__nav-icon">
              <ThemeIcon size={16} strokeWidth={1.8} />
            </span>
            {!isCollapsed && (
              <span className="sidebar__nav-label">
                {themeMode === 'auto' ? 'Thème auto' : themeMode === 'dark' ? 'Mode sombre' : 'Mode clair'}
              </span>
            )}
          </button>

          {!isCollapsed ? (
            <p className="m-0 px-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--kicker)]">
              Version Opérations
            </p>
          ) : null}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="sidebar__collapse-btn hidden lg:flex"
            aria-label={isCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
