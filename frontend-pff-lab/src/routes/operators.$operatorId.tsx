import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { fetchOperator, updateOperator, deleteOperator, getApiErrorMessage } from '../lib/api'
import type { OperatorUser } from '../lib/api'
import PageHeader from '../components/layout/PageHeader'
import Spinner from '../components/Spinner'
import { ArrowLeft, Edit2, Trash2, Save, X, Mail, Shield, Calendar, Key } from 'lucide-react'
import { labelize, formatDateTime } from '../components/intake/utils'

export const Route = createFileRoute('/operators/$operatorId')({
  component: OperatorDetail,
})

function OperatorDetail() {
  const { operatorId } = Route.useParams()
  const navigate = useNavigate()
  
  const [operator, setOperator] = useState<OperatorUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<'intake_operator' | 'intake_manager' | 'admin'>('intake_operator')
  const [editActive, setEditActive] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    void loadOperator()
  }, [operatorId])

  const loadOperator = async () => {
    setLoading(true)
    try {
      const data = await fetchOperator(operatorId)
      setOperator(data)
      setEditName(data.full_name || '')
      setEditEmail(data.email)
      setEditRole(data.role)
      setEditActive(data.is_active)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editEmail) {
      setError("L'email est requis")
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      const updated = await updateOperator(operatorId, { 
        email: editEmail,
        full_name: editName,
        role: editRole,
        is_active: editActive
      })
      setOperator(updated)
      setIsEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet opérateur ? Cette action est irréversible.")) return
    setActionLoading(true)
    try {
      await deleteOperator(operatorId)
      navigate({ to: '/operators' })
    } catch (err) {
      setError(getApiErrorMessage(err))
      setActionLoading(false)
    }
  }

  if (loading) {
     return <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
  }
  
  if (error && !operator) {
     return (
       <div className="p-12 text-center">
         <div className="inline-block mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Erreur: {error}
         </div>
         <div className="text-[var(--sea-ink-soft)]">Impossible de charger le profil.</div>
       </div>
     )
  }

  if (!operator) {
     return <div className="p-12 text-center text-[var(--sea-ink-soft)]">Opérateur introuvable.</div>
  }

  return (
    <>
      <PageHeader 
        kicker="Dossier Opérateur"
        title={operator.full_name || operator.email}
        subtitle={`Enregistré le ${formatDateTime(operator.created_at)}`}
        actions={
          <button onClick={() => navigate({ to: '/operators' })} className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition-colors">
            <ArrowLeft size={16} />
            Retour à la liste
          </button>
        }
      />
      <div className="content-padding max-w-4xl mx-auto mt-6">
        {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
        )}

        <div className="island-shell overflow-hidden">
          <div className="p-6 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-5">
               <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon)] text-white font-black text-3xl shadow-md">
                    {(operator.full_name ?? operator.email).charAt(0).toUpperCase()}
               </div>
               <div>
                  <h2 className="text-xl font-bold text-[var(--sea-ink)] flex items-center gap-3">
                    Profil Opérateur
                    {!isEditing && (
                       <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${operator.is_active ? 'bg-[var(--palm)]/10 text-[var(--palm)] border-[var(--palm)]/20' : 'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] border-[var(--line)]'}`}>
                          {operator.is_active ? 'Actif' : 'Inactif'}
                       </span>
                    )}
                  </h2>
                  <p className="text-sm text-[var(--sea-ink-soft)]">Habilitations et configuration du compte</p>
               </div>
            </div>
            {!isEditing ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPasswordModalOpen(true)} 
                  className="btn-secondary"
                >
                  <Key size={16} /> Mot de passe
                </button>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="btn-secondary"
                >
                  <Edit2 size={16} /> Modifier
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="btn-danger"
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="btn-secondary"
                >
                  <X size={16} /> Annuler
                </button>
                <button 
                  onClick={handleUpdate}
                  disabled={actionLoading}
                  className="btn-primary"
                >
                  <Save size={16} /> {actionLoading ? '...' : 'Enregistrer'}
                </button>
              </div>
            )}
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-6">
               <div className="relative group">
                 <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1">Nom Complet</label>
                 {isEditing ? (
                   <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="field-shell" placeholder="Agent Admin" />
                 ) : (
                   <p className="text-lg text-[var(--sea-ink)] font-semibold">{operator.full_name || '—'}</p>
                 )}
               </div>
               <div className="relative group">
                 <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                    <Mail size={14}/> Adresse Email
                 </label>
                 {isEditing ? (
                   <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="field-shell" />
                 ) : (
                   <p className="text-lg text-[var(--sea-ink)] font-semibold">{operator.email}</p>
                 )}
               </div>
               
               {isEditing && (
                 <div className="relative group pt-4 border-t border-[var(--line)]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editActive} 
                        onChange={e => setEditActive(e.target.checked)} 
                        className="w-5 h-5 rounded border-[var(--line)] text-[var(--lagoon)] focus:ring-[var(--lagoon)] bg-[var(--surface-elevated)]"
                      />
                      <span className="text-sm font-bold text-[var(--sea-ink)]">Compte Actif</span>
                    </label>
                    <p className="text-xs text-[var(--sea-ink-soft)] mt-1 ml-8">Permet à l'opérateur de se connecter au portail.</p>
                 </div>
               )}
             </div>
             
             <div className="glass-panel p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--lagoon)]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="text-sm font-bold text-[var(--sea-ink)] mb-6 flex items-center gap-2 uppercase tracking-wide">
                  <Shield size={16} className="text-[var(--lagoon)]"/> Sécurité & Accès
                </h3>
                <div className="space-y-6 relative z-10">
                   <div>
                     <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-2">Rôle Système</label>
                     {isEditing ? (
                       <select value={editRole} onChange={e => setEditRole(e.target.value as any)} className="field-shell">
                         <option value="intake_operator">Opérateur</option>
                         <option value="intake_manager">Manager</option>
                         <option value="admin">Administrateur</option>
                       </select>
                     ) : (
                       <div className="inline-block bg-[var(--chip-bg)] text-[var(--sea-ink)] border border-[var(--line)] px-3 py-1 rounded-md text-sm font-bold">
                         {labelize(operator.role)}
                       </div>
                     )}
                   </div>
                   
                   <div>
                      <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                         <Calendar size={14}/> Dernière connexion
                      </label>
                      <p className="text-sm text-[var(--sea-ink)] font-semibold mt-1 bg-[var(--surface-elevated)] border border-[var(--line)] rounded-lg p-2 shadow-sm inline-block">
                        {operator.last_login_at ? formatDateTime(operator.last_login_at) : 'Jamais connecté'}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      <AnimatePresence>
         {isPasswordModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                 onClick={() => setIsPasswordModalOpen(false)}
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 10 }}
                 className="relative w-full max-w-md bg-[var(--surface)] text-[var(--sea-ink)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--line)]"
               >
                  <div className="p-5 border-b border-[var(--line)] flex items-center justify-between">
                     <h3 className="font-bold text-lg flex items-center gap-2">
                        <Key size={18} className="text-[var(--lagoon)]" /> Forcer Réinitialisation
                     </h3>
                     <button onClick={() => setIsPasswordModalOpen(false)} className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6">
                     <p className="text-sm text-[var(--sea-ink-soft)] mb-4">
                        Définissez un nouveau mot de passe temporaire ou permanent pour cet opérateur. Il pourra se connecter immédiatement avec.
                     </p>
                     <input 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="field-shell w-full"
                        placeholder="Nouveau mot de passe"
                     />
                  </div>
                  <div className="p-5 bg-[var(--surface-elevated)] border-t border-[var(--line)] flex justify-end gap-3">
                     <button className="btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>Annuler</button>
                     <button className="btn-danger" disabled={newPassword.length < 6 || actionLoading} onClick={async () => {
                        setActionLoading(true)
                        try {
                           const updated = await updateOperator(operatorId, { password: newPassword })
                           setOperator(updated)
                           setNewPassword('')
                           setIsPasswordModalOpen(false)
                           alert('Mot de passe mis à jour avec succès.')
                        } catch (err) {
                           setError(getApiErrorMessage(err))
                        } finally {
                           setActionLoading(false)
                        }
                     }}>
                        {actionLoading ? '...' : 'Valider'}
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </>
  )
}
