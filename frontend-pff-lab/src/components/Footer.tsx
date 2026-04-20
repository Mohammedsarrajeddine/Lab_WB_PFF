import { Link } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer mt-20 px-4 pb-12 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap grid gap-4 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="island-shell panel-tint-blue rounded-2xl p-5">
          <p className="island-kicker m-0">PFF Lab Platform</p>
          <p className="mt-2 mb-0 max-w-md text-sm leading-6">
            Interface interne pour piloter l'intake WhatsApp, le suivi des ordonnances
            et l'assistance conversationnelle.
          </p>
        </div>

        <div className="island-shell panel-tint-green rounded-2xl p-5">
          <p className="m-0 text-xs font-semibold tracking-[0.14em] text-[var(--kicker)] uppercase">Modules</p>
          <ul className="mt-2 m-0 list-none space-y-1 p-0 text-sm">
            <li>
              <Link to="/intake" className="no-underline hover:underline">
                Intake Desk
              </Link>
            </li>
            <li>
              <Link to="/chat" className="no-underline hover:underline">
                Assistant Chat
              </Link>
            </li>
            <li>
              <Link to="/about" className="no-underline hover:underline">
                Plateforme
              </Link>
            </li>
          </ul>
        </div>

        <div className="island-shell panel-tint-warm rounded-2xl p-5">
          <p className="m-0 text-xs font-semibold tracking-[0.14em] text-[var(--kicker)] uppercase">Backend</p>
          <ul className="mt-2 m-0 list-none space-y-1 p-0 text-sm">
            <li>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="no-underline hover:underline"
              >
                API Docs
              </a>
            </li>
            <li>
              <a
                href="http://localhost:8000/api/v1/health"
                target="_blank"
                rel="noreferrer"
                className="no-underline hover:underline"
              >
                Health Endpoint
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="page-wrap mt-8 border-t border-[var(--line)] pt-4 text-xs">
        &copy; {year} PFF Lab. Internal Operations Console.
      </div>
    </footer>
  )
}
