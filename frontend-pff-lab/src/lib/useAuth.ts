import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  clearStoredAccessToken,
  fetchCurrentOperator,
  getApiErrorMessage,
  getStoredAccessToken,
  loginOperator,
} from './api'
import type { OperatorUser } from './api'

export interface UseAuthReturn {
  currentOperator: OperatorUser | null
  isAuthLoading: boolean
  authError: string | null
  loginEmail: string
  setLoginEmail: (v: string) => void
  loginPassword: string
  setLoginPassword: (v: string) => void
  isLoggingIn: boolean
  handleLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>
  handleLogout: () => void
  /** Force-clear auth state (useful when a downstream API call returns 401). */
  handleUnauthorized: (message: string) => void
}

function dispatchAuthChange(operator: OperatorUser | null) {
  window.dispatchEvent(
    new CustomEvent('pff-auth-change', { detail: { operator } }),
  )
}

export function useAuth(): UseAuthReturn {
  const [currentOperator, setCurrentOperator] = useState<OperatorUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const email = loginEmail.trim().toLowerCase()
      if (!email || !loginPassword) {
        setAuthError('Email et mot de passe requis.')
        return
      }
      setIsLoggingIn(true)
      setAuthError(null)
      try {
        const payload = await loginOperator({ email, password: loginPassword })
        setCurrentOperator(payload.operator)
        setLoginPassword('')
        dispatchAuthChange(payload.operator)
      } catch (error: unknown) {
        clearStoredAccessToken()
        setCurrentOperator(null)
        setAuthError(getApiErrorMessage(error))
      } finally {
        setIsLoggingIn(false)
      }
    },
    [loginEmail, loginPassword],
  )

  const handleLogout = useCallback(() => {
    clearStoredAccessToken()
    setCurrentOperator(null)
    setAuthError('Déconnecté. Connectez-vous pour continuer.')
    dispatchAuthChange(null)
  }, [])

  const handleUnauthorized = useCallback((message: string) => {
    clearStoredAccessToken()
    setCurrentOperator(null)
    setIsAuthLoading(false)
    setAuthError(message)
    dispatchAuthChange(null)
  }, [])

  // Restore session on mount
  useEffect(() => {
    const storedToken = getStoredAccessToken()
    if (!storedToken) {
      setIsAuthLoading(false)
      return
    }

    const controller = new AbortController()
    setIsAuthLoading(true)
    setAuthError(null)

    fetchCurrentOperator(controller.signal)
      .then((operator) => {
        setCurrentOperator(operator)
        dispatchAuthChange(operator)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        clearStoredAccessToken()
        setCurrentOperator(null)
        setAuthError(getApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsAuthLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  return {
    currentOperator,
    isAuthLoading,
    authError,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    isLoggingIn,
    handleLogin,
    handleLogout,
    handleUnauthorized,
  }
}
