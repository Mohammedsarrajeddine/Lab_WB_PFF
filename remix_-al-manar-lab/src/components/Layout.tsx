import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Microscope, 
  FileText, 
  MessageCircle, 
  Sparkles, 
  Settings, 
  UserCircle, 
  LogOut,
  Search,
  Bell,
  Contrast,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  MessageSquare,
  TriangleAlert,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'analyses', label: 'Analyses', icon: Microscope },
    { id: 'results', label: 'Résultats', icon: FileText },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'chatbot', label: 'Chatbot', icon: MessageSquare },
  ];

  return (
    <aside className={cn(
      "h-screen fixed left-0 top-0 flex flex-col justify-between bg-white py-6 px-4 z-50 transition-all duration-300 border-r border-surface-container",
      isCollapsed ? "w-[80px]" : "w-[260px]"
    )}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
            <Microscope size={24} />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="text-xl font-bold text-primary tracking-tight leading-none font-headline">AL MANAR LAB</h1>
              <p className="text-[10px] font-medium text-outline uppercase tracking-widest mt-1">Laboratoire d'analyses médicales</p>
            </div>
          )}
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm overflow-hidden",
                activeTab === item.id 
                  ? "bg-surface-container-low text-primary shadow-sm" 
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-label whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm overflow-hidden text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50",
          )}
          title={isCollapsed ? "Agrandir" : "Réduire"}
        >
          {isCollapsed ? <ChevronRight size={20} className="shrink-0" /> : <ChevronLeft size={20} className="shrink-0" />}
          {!isCollapsed && <span className="font-label whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Réduire</span>}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm overflow-hidden",
            activeTab === 'settings' ? "bg-surface-container-low text-primary shadow-sm" : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50"
          )}
          title={isCollapsed ? "Paramètres" : undefined}
        >
          <Settings size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-label whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Paramètres</span>}
        </button>
        <button 
          onClick={() => setActiveTab('account')}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm overflow-hidden",
            activeTab === 'account' ? "bg-surface-container-low text-primary shadow-sm" : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50"
          )}
          title={isCollapsed ? "Compte" : undefined}
        >
          <UserCircle size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-label whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Compte</span>}
        </button>
        <div className="h-[1px] bg-surface-container my-2 mx-2"></div>
        <button 
          onClick={() => onLogout()}
          className="flex items-center gap-3 px-4 py-3 text-error hover:bg-error-container/20 rounded-lg transition-all text-sm overflow-hidden"
          title={isCollapsed ? "Déconnexion" : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-label whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export const TopAppBar: React.FC<{ 
  isSidebarCollapsed: boolean;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
}> = ({ isSidebarCollapsed, onLogout, searchQuery, setSearchQuery, activeTab }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = React.useState(false);

  const notifications = [
    { id: 1, text: "L'analyse #ANA-4421 est urgente", type: 'urgent', time: 'Il y a 2 min' },
    { id: 2, text: "Les résultats #ANA-4422 sont traités", type: 'success', time: 'Il y a 10 min' },
    { id: 3, text: "Nouveau patient enregistré : Sarah B.", type: 'info', time: 'Il y a 15 min' },
  ];

  const alerts = [
    { id: 1, patient: "Yassine EL OUALI", text: "Demande d'assistance humaine (IA bloquée)", time: 'Il y a 5 min' },
    { id: 2, patient: "Amine MANSOURI", text: "Question complexe sur les tarifs", time: 'Il y a 20 min' },
  ];

  return (
    <header className={cn(
      "fixed top-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-surface-container flex justify-between items-center h-16 px-8 transition-all duration-300",
      isSidebarCollapsed ? "w-[calc(100%-80px)]" : "w-[calc(100%-260px)]"
    )}>
      <div className="flex items-center gap-4 flex-1">
        {(activeTab === 'patients' || activeTab === 'analyses' || activeTab === 'results') && (
          <div className="relative w-full max-w-md animate-in fade-in slide-in-from-left-4 duration-500">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input 
              type="text" 
              placeholder={`Rechercher dans ${activeTab === 'patients' ? 'les patients' : activeTab === 'analyses' ? 'les analyses' : 'les résultats'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-surface-container-low border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium transition-all"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold mr-4">
          Admin Lab
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsAlertsOpen(false);
              setIsMenuOpen(false);
            }}
            className={cn(
              "hover:bg-surface-container rounded-full p-2 transition-colors relative",
              isNotificationsOpen && "bg-surface-container text-primary"
            )}
          >
            <Bell size={20} className={cn(isNotificationsOpen ? "text-primary" : "text-on-surface-variant")} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsNotificationsOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-surface-container p-4 z-50"
                >
                  <h3 className="text-sm font-black text-on-surface uppercase tracking-wider mb-4">Notifications</h3>
                  <div className="space-y-3">
                    {notifications.map(n => (
                      <div key={n.id} className="flex gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          n.type === 'urgent' ? "bg-error/10 text-error" : 
                          n.type === 'success' ? "bg-tertiary/10 text-tertiary" : "bg-primary/10 text-primary"
                        )}>
                          {n.type === 'urgent' ? <AlertCircle size={16} /> : 
                           n.type === 'success' ? <CheckCircle2 size={16} /> : <Bell size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface leading-tight">{n.text}</p>
                          <p className="text-[10px] text-outline mt-1">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 py-2 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-lg transition-colors">
                    Tout marquer comme lu
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Alerts History */}
        <div className="relative">
          <button 
            onClick={() => {
              setIsAlertsOpen(!isAlertsOpen);
              setIsNotificationsOpen(false);
              setIsMenuOpen(false);
            }}
            className={cn(
              "hover:bg-surface-container rounded-full p-2 transition-colors relative",
              isAlertsOpen && "bg-surface-container text-error"
            )}
          >
            <TriangleAlert size={20} className={cn(isAlertsOpen ? "text-error" : "text-on-surface-variant")} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>

          <AnimatePresence>
            {isAlertsOpen && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsAlertsOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-surface-container p-4 z-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-error uppercase tracking-wider">Alertes Critiques</h3>
                    <span className="px-2 py-0.5 bg-error/10 text-error text-[10px] font-black rounded-full">HISTORIQUE</span>
                  </div>
                  <div className="space-y-3">
                    {alerts.map(a => (
                      <div key={a.id} className="p-3 rounded-xl bg-error/5 border border-error/10 hover:bg-error/10 transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-black text-on-surface">{a.patient}</p>
                          <p className="text-[10px] text-error font-bold">{a.time}</p>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-tight">{a.text}</p>
                        <div className="mt-2 flex justify-end">
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Traiter maintenant →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {alerts.length === 0 && (
                    <div className="py-8 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-tertiary/30 mb-2" />
                      <p className="text-xs font-bold text-outline">Aucune alerte en attente</p>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
        <div className="relative ml-4">
          <button 
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsNotificationsOpen(false);
              setIsAlertsOpen(false);
            }}
            className="w-9 h-9 rounded-full overflow-hidden bg-surface-container ring-2 ring-white shadow-sm hover:ring-primary transition-all"
          >
            <img 
              className="w-full h-full object-cover" 
              src="https://picsum.photos/seed/doctor/200/200" 
              alt="User Avatar"
              referrerPolicy="no-referrer"
            />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsMenuOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-surface-container p-2 z-50"
                >
                  <div className="px-4 py-3 border-b border-surface-container mb-1">
                    <p className="text-sm font-bold text-on-surface">Sarah Mansouri</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Admin Principal</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/10 rounded-xl transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="font-bold">Déconnexion</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
