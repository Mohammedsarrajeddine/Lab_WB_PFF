import { useState } from 'react'
import type { ResultDetail } from '../../lib/api'

interface ResultPanelProps {
  results: ResultDetail[]
  analysisRequestId?: string
  onUploadResult: (analysisRequestId: string, fileUrl: string) => Promise<void>
  onUpdateStatus: (resultId: string, status: string, notes?: string) => Promise<void>
}

export default function ResultPanel({
  results,
  analysisRequestId,
  onUploadResult,
  onUpdateStatus,
}: ResultPanelProps) {
  const [fileUrl, setFileUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!analysisRequestId || !fileUrl.trim()) return
    setIsUploading(true)
    try {
      await onUploadResult(analysisRequestId, fileUrl.trim())
      setFileUrl('')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusNode = (status: string) => {
    switch(status) {
      case 'pending_validation':
        return <span className="rounded-full border border-yellow-300/60 bg-yellow-50/85 px-2 py-0.5 text-xs font-semibold text-yellow-700">⏳ En attente de validation</span>
      case 'approved':
        return <span className="rounded-full border border-blue-300/60 bg-blue-50/85 px-2 py-0.5 text-xs font-semibold text-blue-700">✅ Approuvé pour envoi</span>
      case 'sending':
        return <span className="rounded-full border border-indigo-300/60 bg-indigo-50/85 px-2 py-0.5 text-xs font-semibold text-indigo-700">📤 Envoi en cours…</span>
      case 'delivered':
        return <span className="rounded-full border border-emerald-300/60 bg-emerald-50/85 px-2 py-0.5 text-xs font-semibold text-emerald-700">✅ Envoyé (WhatsApp)</span>
      case 'delivery_failed':
        return <span className="rounded-full border border-orange-400/60 bg-orange-50/85 px-2 py-0.5 text-xs font-semibold text-orange-700">⚠️ Échec d'envoi</span>
      case 'rejected':
        return <span className="rounded-full border border-red-300/60 bg-red-50/85 px-2 py-0.5 text-xs font-semibold text-red-700">❌ Rejeté</span>
      default:
        return <span className="text-xs font-semibold">{status}</span>
    }
  }

  return (
    <section className="tonal-card panel-tint-blue rounded-2xl p-5 sm:p-6 mt-4">
      <h3 className="m-0 mb-3 text-lg font-semibold text-[var(--sea-ink)]">
        🔬 Résultats d'Analyses ({results.length})
      </h3>
      
      {analysisRequestId && (
        <form onSubmit={handleUpload} className="mb-4 flex gap-2">
          <input 
            type="url" 
            placeholder="URL du fichier (PDF simulé)..."
            required
            className="field-shell flex-1"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
          />
          <button type="submit" disabled={isUploading} className="btn-primary-gradient py-1.5 px-3 text-sm">
            {isUploading ? 'Téléversement…' : 'Uploader'}
          </button>
        </form>
      )}

      {results.length === 0 ? (
        <p className="text-sm text-[var(--sea-ink-soft)] italic">Aucun résultat téléversé pour l'instant.</p>
      ) : (
        <div className="space-y-3">
          {results.map((res) => (
            <div key={res.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)]/84 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                {getStatusNode(res.status)}
                <span className="text-xs text-[var(--sea-ink-soft)]">ID: {res.id.slice(0, 8)}...</span>
              </div>
              <p className="text-sm m-0 mb-3">
                <a href={res.file_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium underline">
                  Voir le fichier des résultats (PDF)
                </a>
              </p>
              
              {res.status === 'pending_validation' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => onUpdateStatus(res.id, 'approved', 'Validation manuelle effectuée.')}
                    className="btn-primary text-xs py-1"
                  >
                    ✅ Approuver et Envoyer 
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(res.id, 'rejected', 'Fichier erroné.')}
                    className="btn-danger text-xs py-1"
                  >
                    ❌ Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
