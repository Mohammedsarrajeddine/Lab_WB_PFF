import Spinner from '../Spinner'
import type { FormEvent } from 'react'

interface LoginFormProps {
  isAuthLoading: boolean
  authError: string | null
  loginEmail: string
  loginPassword: string
  isLoggingIn: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function LoginForm({
  isAuthLoading,
  authError,
  loginEmail,
  loginPassword,
  isLoggingIn,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <div className="max-w-md rise-in">
      <div className="island-shell glass-panel rounded-2xl p-6">
        <p className="island-kicker m-0 mb-1">Authentification</p>
        <h2 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">
          {isAuthLoading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-[var(--lagoon)]" />
              Vérification de session…
            </span>
          ) : (
            'Authentification opérateur'
          )}
        </h2>
        <p className="mt-2 mb-0 text-sm text-[var(--sea-ink-soft)]">
          Utilisez vos identifiants opérateur pour accéder aux conversations.
        </p>

        {authError ? (
          <p className="mt-3 rounded-xl border border-red-300/60 bg-red-50/80 px-3 py-2 text-sm text-red-700">
            {authError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="operator@lab.local"
            autoComplete="username"
            disabled={isAuthLoading || isLoggingIn}
            className="field-shell"
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
            disabled={isAuthLoading || isLoggingIn}
            className="field-shell"
          />
          <button
            type="submit"
            disabled={isAuthLoading || isLoggingIn}
            className="btn-primary-gradient w-fit"
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Connexion…
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
