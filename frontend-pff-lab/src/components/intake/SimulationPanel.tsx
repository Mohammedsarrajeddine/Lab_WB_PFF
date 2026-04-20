import { useState } from 'react'
import Spinner from '../Spinner'
import { getApiErrorMessage, simulatePatientMessage } from '../../lib/api'
import type { FormEvent } from 'react'

interface SimulationPanelProps {
  onMessageSent: (conversationId: string) => void
}

export default function SimulationPanel({
  onMessageSent,
}: SimulationPanelProps) {
  const [phone, setPhone] = useState('+212600000001')
  const [name, setName] = useState('Patient Test')
  const [text, setText] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!text.trim()) return

    setIsSimulating(true)
    setResult(null)

    try {
      const ack = await simulatePatientMessage({
        chat_id: `sim_${phone.replace(/\D/g, '')}`,
        from_phone: phone,
        from_name: name || undefined,
        text,
      })

      setResult(
        `✅ Message ingéré. Ordonnance détectée : ${ack.prescription_detected ? 'Oui' : 'Non'}`,
      )
      setText('')
      onMessageSent(ack.conversation_id)
    } catch (err: unknown) {
      setResult(`❌ ${getApiErrorMessage(err)}`)
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <section className="island-shell panel-tint-green rounded-2xl p-5 sm:p-6">
      <h3 className="m-0 mb-3 text-lg font-semibold text-[var(--sea-ink)]">
        🧪 Simuler un message patient
      </h3>
      <form className="space-y-2" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone"
            className="field-shell w-36"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du patient"
            className="field-shell flex-1"
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Message du patient (ex: Bonjour, j'ai une ordonnance pour des analyses de sang)"
          className="field-shell"
        />
        <button
          type="submit"
          disabled={isSimulating || !text.trim()}
          className="btn-primary"
        >
          {isSimulating ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" /> Envoi…
            </span>
          ) : (
            "Simuler l'envoi"
          )}
        </button>
        {result ? (
          <p className="m-0 rounded-xl border border-[var(--line)] bg-white/58 px-3 py-2 text-sm text-[var(--sea-ink)]">{result}</p>
        ) : null}
      </form>
    </section>
  )
}
