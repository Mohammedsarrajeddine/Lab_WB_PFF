import { useCallback, useEffect, useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Bell, MessageSquare, FileText, X, CheckCircle2 } from 'lucide-react'
import { fetchNotifications, getApiErrorMessage, getStoredAccessToken } from '../../lib/api'
import type { NotificationItem } from '../../lib/api'

const POLL_INTERVAL = 15_000

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} j`
}

function readLastSeenTime(): number {
  if (typeof window === 'undefined') {
    return 0
  }

  const stored = window.localStorage.getItem('pff:last_seen_notif') || '0'
  return Number.parseInt(stored, 10) || 0
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [lastSeenTime, setLastSeenTime] = useState<number>(() => readLastSeenTime())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) return

    try {
      const res = await fetchNotifications()
      setItems(res.items)
      
      // Compute unread based on our local last seen timestamp
      let computedUnread = 0
      for (const item of res.items) {
         if (new Date(item.time).getTime() > lastSeenTime) {
            computedUnread++
         }
      }
      setUnread(computedUnread)
    } catch (e) {
      console.error(getApiErrorMessage(e))
    }
  }, [lastSeenTime])

  useEffect(() => {
    void load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  // Clic extérieur pour fermer
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Mark as read when opening menu
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const newestTime = Math.max(...items.map(i => new Date(i.time).getTime()))
      if (newestTime > lastSeenTime) {
        setLastSeenTime(newestTime)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('pff:last_seen_notif', newestTime.toString())
        }
        setUnread(0)
      }
    }
  }, [isOpen, items, lastSeenTime])

  const handleRemoveAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setItems(items.filter(i => i.id !== id))
    // We don't manually decrement unread here because it's computed vs lastSeenTime
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`topbar__icon-btn ${isOpen ? 'bg-[var(--chip-bg)] text-[var(--accent)]' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--danger)] text-[10px] font-bold text-white shadow shadow-black/20 px-1 border-2 border-[var(--header-bg)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[340px] md:w-[380px] bg-[var(--surface-strong)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] z-50 overflow-hidden border border-[var(--line-strong)]"
          >
             <div className="px-4 py-3 flex justify-between items-center bg-[var(--surface-elevated)] border-b border-[var(--line)]">
                <h3 className="font-bold text-lg text-[var(--sea-ink)] m-0 tracking-tight">Notifications</h3>
             </div>
             
             <div className="max-h-[420px] overflow-y-auto overflow-x-hidden no-scrollbar bg-[var(--surface-strong)] py-1">
                {items.length === 0 ? (
                  <div className="px-6 py-10 text-center text-[var(--sea-ink-soft)] flex flex-col items-center justify-center">
                     <div className="w-12 h-12 rounded-full bg-[var(--chip-bg)] flex items-center justify-center mb-3">
                        <CheckCircle2 size={24} className="opacity-50" />
                     </div>
                     <p className="text-sm font-medium">Vous êtes à jour</p>
                     <p className="text-xs mt-1 opacity-70">Aucune nouvelle notification.</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {items.map((alert) => (
                      <button 
                        key={alert.id}
                        className="w-full relative px-3 py-3 focus:bg-[var(--chip-bg)] focus:outline-none transition-colors border-b border-[var(--line)] border-dotted last:border-0"
                        onClick={() => {
                           setIsOpen(false);
                           navigate({ to: '/intake' });
                        }}
                      >
                         {/* Hover highlight background absolute */}
                         <div className="absolute inset-x-2 inset-y-1 rounded-lg hover:bg-[var(--chip-bg)] transition-colors pointer-events-none -z-10" />

                         <div className="flex items-start gap-3 w-full text-left">
                           <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0 shadow-sm relative">
                             {alert.type === 'prescription' ? <FileText size={20} fill="currentColor" fillOpacity={0.2} /> : <MessageSquare size={20} fill="currentColor" fillOpacity={0.2} />}
                             {/* Facebook small blue/green dot for unread status */}
                             <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--accent)] rounded-full border-2 border-[var(--surface-strong)]" />
                           </div>
                           
                           <div className="flex-1 min-w-0 pr-6">
                             <div className="text-[13px] text-[var(--sea-ink)] leading-snug line-clamp-3">
                                <span className="font-bold mr-1">{alert.title}</span> 
                                <span className="text-[var(--sea-ink-soft)]">{alert.message}</span>
                             </div>
                             <div className="text-[11px] text-[var(--accent)] font-semibold mt-1">
                               {timeAgo(alert.time)}
                             </div>
                           </div>
                         </div>
                         
                         {/* Quick remove action */}
                         <div 
                           className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[var(--surface-elevated)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger)]/20 hover:text-[var(--danger)] text-[var(--sea-ink-soft)]"
                           onClick={(e) => handleRemoveAlert(alert.id, e)}
                           role="button"
                           title="Supprimer cette notification"
                         >
                           <X size={14} />
                         </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>
             
             {items.length > 0 && (
               <div className="p-2 bg-[var(--surface-elevated)] border-t border-[var(--line)] text-center">
                  <button 
                     onClick={() => { setIsOpen(false); navigate({ to: '/intake' }) }}
                     className="w-full py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--chip-bg)] rounded-md transition-colors"
                  >
                     Voir toutes les notifications
                  </button>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
