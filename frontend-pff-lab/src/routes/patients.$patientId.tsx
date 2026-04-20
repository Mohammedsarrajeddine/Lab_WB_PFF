import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { fetchPatient, updatePatient, deletePatient, fetchConversations, createInternalNote, getApiErrorMessage } from '../lib/api'
import type { PatientItem, ConversationListItem } from '../lib/api'
import PageHeader from '../components/layout/PageHeader'
import Spinner from '../components/Spinner'
import { ArrowLeft, Edit2, Trash2, Phone, Save, X, MessageSquare, Clock, FileText, Plus, Search, MapPin, Shield, Hash, Calendar, User } from 'lucide-react'
import { formatDateTime, labelize } from '../components/intake/utils'
import ConversationListModal from '../components/modals/ConversationListModal'

export const Route = createFileRoute('/patients/$patientId')({
  component: PatientDetail,
})

function PatientDetail() {
  const { patientId } = Route.useParams()
  const navigate = useNavigate()
  
  const [patient, setPatient] = useState<PatientItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)

  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isConvModalOpen, setIsConvModalOpen] = useState(false)
  const [noteContent, setNoteContent] = useState('')

  useEffect(() => {
    void loadPatient()
  }, [patientId])

  const loadPatient = async () => {
    setLoading(true)
    try {
      const data = await fetchPatient(patientId)
      setPatient(data)
      setEditName(data.full_name || '')
      setEditPhone(data.phone_e164 || '')
      setEditDob(data.date_of_birth || '')
      setEditGender(data.gender || '')
      setEditAddress(data.address || '')
      setEditCity(data.city || '')

      const convs = await fetchConversations({ patient_id: patientId, limit: 10 })
      setConversations(convs.items)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editPhone) {
      setError('Le téléphone est requis')
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      const updated = await updatePatient(patientId, {
        full_name: editName,
        phone_e164: editPhone,
        date_of_birth: editDob || null,
        gender: editGender || null,
        address: editAddress || null,
        city: editCity || null,
      })
      setPatient(updated)
      setIsEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est irréversible.")) return
    setActionLoading(true)
    try {
      await deletePatient(patientId)
      navigate({ to: '/patients' })
    } catch (err) {
      setError(getApiErrorMessage(err))
      setActionLoading(false)
    }
  }

  if (loading) {
     return <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
  }
  
  if (error && !patient) {
     return (
       <div className="p-12 text-center">
         <div className="inline-block mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Erreur: {error}
         </div>
         <div className="text-[var(--sea-ink-soft)]">Impossible de charger le profil.</div>
       </div>
     )
  }

  if (!patient) {
     return <div className="p-12 text-center text-[var(--sea-ink-soft)]">Patient introuvable.</div>
  }

  return (
    <>
      <PageHeader 
        kicker="Dossier Patient"
        title={patient.full_name || 'Patient inconnu'}
        subtitle={`Enregistré le ${formatDateTime(patient.created_at)}`}
        actions={
          <button onClick={() => navigate({ to: '/patients' })} className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition-colors">
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
                    {(patient.full_name ?? '?').charAt(0).toUpperCase()}
               </div>
               <div>
                  <h2 className="text-xl font-bold text-[var(--sea-ink)]">Informations Générales</h2>
                  <p className="text-sm text-[var(--sea-ink-soft)]">Coordonnées et identification</p>
               </div>
            </div>
            {!isEditing ? (
              <div className="flex items-center gap-2">
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
             <div className="space-y-5">
               <div>
                 <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1">Nom Complet</label>
                 {isEditing ? (
                   <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="field-shell" placeholder="Jean Dupont" />
                 ) : (
                   <p className="text-base text-[var(--sea-ink)] font-semibold">{patient.full_name || '—'}</p>
                 )}
               </div>
               <div>
                 <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                    <Phone size={12}/> Téléphone
                 </label>
                 {isEditing ? (
                   <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="field-shell" placeholder="+212..." />
                 ) : (
                   <p className="text-base text-[var(--sea-ink)] font-semibold">{patient.phone_e164}</p>
                 )}
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                     <Calendar size={12}/> Date de naissance
                   </label>
                   {isEditing ? (
                     <input type="date" value={editDob} onChange={e => setEditDob(e.target.value)} className="field-shell" />
                   ) : (
                     <p className="text-sm text-[var(--sea-ink)]">{patient.date_of_birth || '—'}</p>
                   )}
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                     <User size={12}/> Genre
                   </label>
                   {isEditing ? (
                     <select value={editGender} onChange={e => setEditGender(e.target.value)} className="field-shell">
                       <option value="">—</option>
                       <option value="M">Masculin</option>
                       <option value="F">Féminin</option>
                     </select>
                   ) : (
                     <p className="text-sm text-[var(--sea-ink)]">{patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : '—'}</p>
                   )}
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                   <MapPin size={12}/> Adresse
                 </label>
                 {isEditing ? (
                   <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} className="field-shell" placeholder="Adresse..." />
                 ) : (
                   <p className="text-sm text-[var(--sea-ink)]">{patient.address || '—'}</p>
                 )}
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1">Ville</label>
                   {isEditing ? (
                     <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} className="field-shell" placeholder="Casablanca..." />
                   ) : (
                     <p className="text-sm text-[var(--sea-ink)]">{patient.city || '—'}</p>
                   )}
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                     <Hash size={12}/> Réf.
                   </label>
                   <p className="text-sm text-[var(--sea-ink)] font-mono">{patient.reference_number || '—'}</p>
                 </div>
               </div>
               {(patient.insurance_name || patient.channel_name) && (
                 <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--line)]">
                   {patient.insurance_name && (
                     <div>
                       <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1 flex items-center gap-1">
                         <Shield size={12}/> Assurance
                       </label>
                       <p className="text-sm text-[var(--sea-ink)] font-semibold">{patient.insurance_name}</p>
                     </div>
                   )}
                   {patient.channel_name && (
                     <div>
                       <label className="block text-xs font-bold text-[var(--sea-ink-soft)] tracking-widest uppercase mb-1">Canal</label>
                       <p className="text-sm text-[var(--sea-ink)] font-semibold">{patient.channel_name}</p>
                     </div>
                   )}
                 </div>
               )}
             </div>
             
             <div className="glass-panel p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--lagoon)]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="text-sm font-bold text-[var(--sea-ink)] mb-6 flex items-center gap-2 uppercase tracking-wide">
                  <MessageSquare size={16} className="text-[var(--lagoon)]"/> Historique Global
                </h3>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                   <button
                     onClick={() => setIsConvModalOpen(true)}
                     className="bg-[var(--surface-elevated)] border border-[var(--line)] rounded-xl p-4 shadow-sm text-center transform transition-all hover:-translate-y-1 hover:shadow-md hover:border-[var(--lagoon)]/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--lagoon)]/30"
                   >
                     <span className="block text-3xl font-black text-[var(--lagoon)] mb-1">{patient.conversation_count}</span>
                     <span className="text-xs font-medium uppercase tracking-wider text-[var(--sea-ink-soft)]">Conversations</span>
                     <span className="block mt-2 text-[10px] font-semibold text-[var(--lagoon)] opacity-0 group-hover:opacity-100 transition-opacity">Cliquer pour voir</span>
                   </button>
                   <button
                     onClick={() => setIsConvModalOpen(true)}
                     className="bg-[var(--surface-elevated)] border border-[var(--line)] rounded-xl p-4 shadow-sm text-center flex flex-col justify-center transform transition-all hover:-translate-y-1 hover:shadow-md hover:border-[var(--lagoon)]/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--lagoon)]/30"
                   >
                     <Clock size={24} className="mx-auto text-[var(--lagoon)] mb-2 opacity-80" />
                     <span className="text-sm font-bold text-[var(--sea-ink)] leading-tight mb-1">
                        {patient.last_message_at ? formatDateTime(patient.last_message_at) : 'Jamais'}
                     </span>
                     <span className="text-[10px] uppercase tracking-wider text-[var(--sea-ink-soft)]">Dernière activité</span>
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Historique des Tests */}
        <div className="mt-8 island-shell overflow-hidden">
           <div className="p-5 border-b border-[var(--line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <FileText size={18} className="text-[var(--sea-ink-soft)]" />
                 <h2 className="text-lg font-bold text-[var(--sea-ink)]">Historique des Tests & Interventions</h2>
              </div>
              <button 
                onClick={() => setIsNoteModalOpen(true)}
                className="btn-primary"
              >
                 <Plus size={16} /> Note Clinique
              </button>
           </div>
           
           <div className="overflow-x-auto text-sm">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-[var(--surface-elevated)] border-b border-[var(--line-strong)] text-[var(--sea-ink-soft)] text-xs uppercase tracking-wider">
                   <th className="p-4 font-bold">Identifiant</th>
                   <th className="p-4 font-bold">Statut</th>
                   <th className="p-4 font-bold">Dernier Message</th>
                   <th className="p-4 font-bold">Phase Analyse</th>
                   <th className="p-4 font-bold max-w-[200px]">Aperçu</th>
                   <th className="p-4 font-bold">Date Création</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[var(--line)]">
                 {conversations.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="p-8 text-center text-[var(--sea-ink-soft)]">
                        <Search size={32} className="mx-auto mb-3 opacity-30" />
                        Aucun historique trouvé pour ce patient.
                     </td>
                   </tr>
                 ) : (
                   conversations.map((conv) => (
                     <tr 
                       key={conv.id} 
                       onClick={() => navigate({ to: '/intake' })}
                       className="hover:bg-[var(--link-bg-hover)] transition-colors cursor-pointer group"
                     >
                       <td className="p-4 font-mono text-xs text-[var(--lagoon)] group-hover:underline">
                           {conv.id.split('-')[0].toUpperCase()}
                       </td>
                       <td className="p-4">
                         <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--chip-bg)] text-[var(--sea-ink)]">
                           {labelize(conv.status)}
                         </span>
                       </td>
                       <td className="p-4 text-[var(--sea-ink-soft)]">
                         {conv.last_message_at ? formatDateTime(conv.last_message_at) : '—'}
                       </td>
                       <td className="p-4">
                         {conv.analysis_request_status ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--chip-bg)] text-[var(--sea-ink)]">
                              {labelize(conv.analysis_request_status)}
                            </span>
                         ) : '—'}
                       </td>
                       <td className="p-4 text-[var(--sea-ink-soft)] text-xs line-clamp-2 max-w-[200px]">
                         {conv.last_message_preview || 'Aucun message textuel.'}
                       </td>
                       <td className="p-4 text-[var(--sea-ink-soft)]">
                         {formatDateTime(conv.created_at)}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>

      {/* Note Clinique Modal */}
      <AnimatePresence>
         {isNoteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                 onClick={() => setIsNoteModalOpen(false)}
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 10 }}
                 className="relative w-full max-w-lg bg-[var(--surface)] text-[var(--sea-ink)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--line)]"
               >
                  <div className="p-5 border-b border-[var(--line)] flex items-center justify-between">
                     <h3 className="font-bold text-lg">Ajouter une Note Clinique</h3>
                     <button onClick={() => setIsNoteModalOpen(false)} className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6">
                     <textarea 
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="field-shell w-full min-h-[120px] resize-none"
                        placeholder="Ex: Le patient a signalé des antécédents d'anémie..."
                     />
                  </div>
                  <div className="p-5 bg-[var(--surface-elevated)] border-t border-[var(--line)] flex justify-end gap-3">
                     <button className="btn-secondary" onClick={() => setIsNoteModalOpen(false)}>Annuler</button>
                     <button className="btn-primary" disabled={noteSaving || !noteContent.trim()} onClick={async () => {
                        if (!conversations.length) {
                          alert('Aucune conversation associée pour y attacher la note.')
                          return
                        }
                        setNoteSaving(true)
                        try {
                          await createInternalNote(conversations[0].id, { content: noteContent })
                          setNoteContent('')
                          setIsNoteModalOpen(false)
                        } catch (err) {
                          alert(getApiErrorMessage(err))
                        } finally {
                          setNoteSaving(false)
                        }
                     }}>{noteSaving ? '...' : 'Enregistrer la note'}</button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <ConversationListModal 
        isOpen={isConvModalOpen}
        onClose={() => setIsConvModalOpen(false)}
        title="Historique des Conversations"
        subtitle={`Dossier de ${patient.full_name || 'Patient Inconnu'}`}
        fetchParams={{ patient_id: patient.id }}
      />
    </>
  )
}
