import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getApiErrorMessage,
  sendChatMessage,
} from '../lib/api'
import PageHeader from '../components/layout/PageHeader'
import type { FormEvent } from 'react'
import type { ChatConversationHistoryItem } from '../lib/api'

export const Route = createFileRoute('/chat')({
  component: ChatPage,
})

interface ChatBubble {
  id: number
  role: 'user' | 'assistant'
  content: string
  isOffHours?: boolean
  sources?: string[]
}

let nextId = 1

function ChatPage() {
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const buildHistory = useCallback(
    (current: ChatBubble[]): ChatConversationHistoryItem[] => {
      return current
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))
    },
    [],
  )

  const handleSend = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const text = inputText.trim()
      if (!text || isLoading) {
        return
      }

      setError(null)
      const userBubble: ChatBubble = {
        id: nextId++,
        role: 'user',
        content: text,
      }

      setMessages((prev) => [...prev, userBubble])
      setInputText('')
      setIsLoading(true)

      try {
        const history = buildHistory([
          ...messages,
          userBubble,
        ])

        const result = await sendChatMessage({
          message: text,
          conversation_history: history.slice(0, -1),
        })

        const assistantBubble: ChatBubble = {
          id: nextId++,
          role: 'assistant',
          content: result.response,
          isOffHours: result.is_off_hours,
          sources: result.sources,
        }

        setMessages((prev) => [...prev, assistantBubble])
      } catch (err: unknown) {
        setError(getApiErrorMessage(err))
      } finally {
        setIsLoading(false)
        inputRef.current?.focus()
      }
    },
    [buildHistory, inputText, isLoading, messages],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        const form = event.currentTarget.closest('form')
        form?.requestSubmit()
      }
    },
    [],
  )

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        kicker="Assistant Virtuel"
        title="Assistant IA du laboratoire"
        subtitle="Posez vos questions sur le laboratoire : horaires, localisation, documents, résultats…"
        tint="panel-tint-green"
        actions={
          <div className="flex items-center gap-2">
            <OffHoursBadge messages={messages} />
            <span className="hidden sm:inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[10px] text-[var(--sea-ink-soft)]">
              Entrée pour envoyer · Shift+Entrée nouvelle ligne
            </span>
          </div>
        }
      />

      {/* Chat area fills remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        >
          {messages.length === 0 ? (
            <EmptyState onSuggestionClick={(text) => setInputText(text)} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} bubble={msg} />
              ))}
              {isLoading ? <TypingIndicator /> : null}
            </div>
          )}
        </div>

        {/* Error */}
        {error ? (
          <div className="border-t border-red-200/40 bg-red-50/85 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-3 border-t border-[var(--line)] bg-[var(--surface-strong)]/95 px-4 py-3 sm:px-6"
        >
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre question…"
            rows={1}
            disabled={isLoading}
            className="field-shell max-h-32 min-h-[42px] flex-1 resize-none px-4 py-2.5 text-sm"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="btn-primary-gradient flex h-[42px] w-[42px] shrink-0 rounded-xl p-0"
          >
            {isLoading ? (
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="62.83"
                  strokeDashoffset="20"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function OffHoursBadge({ messages }: { messages: ChatBubble[] }) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  if (!lastAssistant?.isOffHours) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50/82 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Hors horaires
    </span>
  )
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const suggestions = [
    'Quels sont les horaires du laboratoire ?',
    'Comment envoyer mon ordonnance ?',
    'Quels documents dois-je apporter ?',
    'Quel est le délai pour les résultats ?',
  ]

  return (
    <div className="glass-panel flex h-full flex-col items-center justify-center rounded-2xl px-4 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-[rgba(79,184,178,0.10)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-7 w-7 text-[var(--lagoon-deep)]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
      </div>
      <h2 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">
        Bienvenue !
      </h2>
      <p className="mt-1.5 mb-0 max-w-md text-sm text-[var(--sea-ink-soft)]">
        Je suis l'assistant virtuel du laboratoire. Posez-moi une question ou
        essayez l'une des suggestions ci-dessous.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => onSuggestionClick(text)}
            className="btn-secondary rounded-full px-3 py-1.5 text-xs font-medium"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ bubble }: { bubble: ChatBubble }) {
  const isUser = bubble.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          isUser
            ? 'rounded-br-md border border-[rgba(0,74,198,0.35)] bg-[rgba(37,99,235,0.12)] text-[var(--sea-ink)] shadow-[0_6px_14px_rgba(37,99,235,0.14)]'
            : 'rounded-bl-md border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] shadow-[0_6px_14px_rgba(15,23,42,0.08)]'
        }`}
      >
        {!isUser ? (
          <p className="mb-1 mt-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--lagoon-deep)]">
            Assistant
          </p>
        ) : null}
        <div className="whitespace-pre-wrap">{bubble.content}</div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--lagoon)]" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--lagoon)]" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--lagoon)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
