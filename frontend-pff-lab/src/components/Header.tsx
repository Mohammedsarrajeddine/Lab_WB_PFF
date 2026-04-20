import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 shadow-[0_10px_24px_rgba(15,36,54,0.08)] backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-3 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(16,38,56,0.09)] sm:px-4 sm:py-2"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(120deg,rgba(43,143,176,0.95),rgba(242,159,103,0.92))] text-xs font-bold text-white shadow-[0_8px_18px_rgba(35,111,140,0.35)]">
              P
            </span>
            <span className="leading-tight">
              <span className="island-kicker block text-[10px] tracking-[0.17em]">
                PFF Lab Platform
              </span>
              <span className="block text-sm font-semibold">Operations Console</span>
            </span>
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary hidden rounded-full px-3 py-1.5 text-xs no-underline sm:inline-flex"
          >
            API Docs
          </a>
          <ThemeToggle />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[color-mix(in_oklab,var(--chip-bg)_80%,white_20%)] p-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Home
          </Link>
          <Link
            to="/intake"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Intake Desk
          </Link>
          <Link
            to="/chat"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Chat
          </Link>
          <Link
            to="/about"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Plateforme
          </Link>
        </div>
      </nav>
    </header>
  )
}
