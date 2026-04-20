import { useCallback, useEffect, useState } from 'react'
import ErrorBoundary from '../ErrorBoundary'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import {
  clearStoredAccessToken,
  fetchCurrentOperator,
  getStoredAccessToken,
} from '../../lib/api'
import type { OperatorUser } from '../../lib/api'

const SIDEBAR_COLLAPSED_KEY = 'pff_sidebar_collapsed'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Shared auth state at shell level (for topbar user display)
  const [operator, setOperator] = useState<OperatorUser | null>(null)

  // Restore session on mount
  useEffect(() => {
    const token = getStoredAccessToken()
    if (!token) return

    const controller = new AbortController()
    fetchCurrentOperator(controller.signal)
      .then((op) => setOperator(op))
      .catch(() => {
        /* ignore — pages handle their own auth */
      })
    return () => controller.abort()
  }, [])

  // Listen for auth state changes from pages
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'pff_lab_access_token') {
        if (!e.newValue) {
          setOperator(null)
        } else {
          fetchCurrentOperator()
            .then((op) => setOperator(op))
            .catch(() => {})
        }
      }
    }
    window.addEventListener('storage', onStorage)

    // Custom event for same-tab auth changes
    function onAuthChange(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.operator) {
        setOperator(detail.operator)
      } else {
        setOperator(null)
      }
    }
    window.addEventListener('pff-auth-change', onAuthChange)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pff-auth-change', onAuthChange)
    }
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  const handleLogout = useCallback(() => {
    clearStoredAccessToken()
    setOperator(null)
    window.dispatchEvent(
      new CustomEvent('pff-auth-change', { detail: { operator: null } }),
    )
  }, [])

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  return (
    <div
      className="app-shell"
      data-collapsed={isCollapsed}
    >
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="app-shell__content-column">
        <Topbar
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          operator={operator}
          onLogout={handleLogout}
        />

        <div className="app-shell__scroll-area">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>

          {/* Minimal footer */}
          <footer className="app-footer">
            &copy; {new Date().getFullYear()} PFF Lab — Console opérationnelle
          </footer>
        </div>
      </div>
    </div>
  )
}
