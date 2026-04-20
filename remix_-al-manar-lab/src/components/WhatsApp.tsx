import React from 'react';
import { 
  Plus, 
  Minus,
  Search, 
  Bell, 
  Contrast, 
  LayoutGrid, 
  Edit, 
  Phone, 
  Video, 
  MoreVertical, 
  Send, 
  Paperclip, 
  FileText, 
  Download, 
  Sparkles,
  X,
  Mail,
  Smartphone,
  ChevronRight,
  Lightbulb,
  MapPin,
  User,
  Calendar,
  ShieldCheck,
  FileCheck,
  Clock,
  StickyNote,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';

export const WhatsApp: React.FC<{ initialPatient?: string; initialMessage?: string; initialAttachment?: string; onClearState?: () => void }> = ({ initialPatient, initialMessage, initialAttachment, onClearState }) => {
  const [isNotesMinimized, setIsNotesMinimized] = React.useState(false);
  const [activeChatId, setActiveChatId] = React.useState(1);
  const [messageInput, setMessageInput] = React.useState('');
  const [attachment, setAttachment] = React.useState<string | null>(null);

  const conversations = [
    { id: 1, name: 'Asmae Bermi', time: '14:22', lastMsg: 'Est-ce que mes résultats sont prêts ?', unread: 1, avatar: 'https://picsum.photos/seed/patient1/200/200', status: 'en_cours' },
    { id: 2, name: 'Dr. Amine Tazi', time: '12:45', lastMsg: 'Veuillez vérifier le dossier ALM-982...', avatar: 'https://picsum.photos/seed/doctor2/200/200', status: 'valide' },
    { id: 3, name: 'Karim Mansouri', time: 'Hier', lastMsg: 'Merci beaucoup pour votre aide.', avatar: 'https://picsum.photos/seed/patient2/200/200', status: 'pret' },
  ];

  React.useEffect(() => {
    if (initialPatient) {
      const chat = conversations.find(c => c.name.toLowerCase().includes(initialPatient.toLowerCase()));
      if (chat) {
        setActiveChatId(chat.id);
      }
    }
    if (initialMessage) {
      setMessageInput(initialMessage);
    }
    if (initialAttachment) {
      setAttachment(initialAttachment);
    }
    // Clear state after applying
    if (initialPatient || initialMessage || initialAttachment) {
      // Small delay to ensure state is set before clearing in parent
      const timer = setTimeout(() => {
        onClearState?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialPatient, initialMessage]);

  const activeChat = conversations.find(c => c.id === activeChatId) || conversations[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_cours': return 'bg-amber-500';
      case 'pret': return 'bg-blue-500';
      case 'valide': return 'bg-green-500';
      default: return 'bg-outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_cours': return 'En cours';
      case 'pret': return 'Prêt';
      case 'valide': return 'Validé';
      default: return 'Inconnu';
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -m-8 overflow-hidden animate-in fade-in duration-500">
      {/* Conversations List */}
      <section className="w-1/4 flex flex-col bg-surface border-r border-surface-container">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-lg text-on-surface">Messages</h2>
            <button className="p-2 bg-primary-container text-white rounded-lg hover:opacity-90 transition-opacity">
              <Plus size={18} />
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-semibold whitespace-nowrap">Tous</button>
            <button className="px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium whitespace-nowrap hover:bg-surface-container transition-colors">Patient</button>
            <button className="px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium whitespace-nowrap hover:bg-surface-container transition-colors">Médecin</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 px-2">
          {conversations.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChatId(chat.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                chat.id === activeChatId ? "bg-surface-container-low" : "hover:bg-surface-container-lowest"
              )}
            >
              <div className="relative">
                <img alt={chat.name} className="w-12 h-12 rounded-full object-cover" src={chat.avatar} referrerPolicy="no-referrer" />
                <div className={cn("absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full", getStatusColor(chat.status || ''))}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                   <h4 className="font-semibold text-sm text-on-surface truncate">{chat.name}</h4>
                  <span className={cn("text-[10px] font-bold", chat.unread ? "text-primary" : "text-outline")}>{chat.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant truncate font-medium">{chat.lastMsg}</p>
              </div>
              {chat.unread && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold">{chat.unread}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Chat Interface */}
      <section className="w-1/2 flex flex-col bg-surface-container-low relative">
        <div className="h-16 px-6 flex items-center justify-between bg-white/40 backdrop-blur-sm border-b border-white/20">
          <div className="flex flex-col">
            <span className="font-headline font-bold text-sm">{activeChat.name}</span>
            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> En ligne
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-outline hover:text-primary transition-colors"><Search size={20} /></button>
            <button className="p-2 text-outline hover:text-primary transition-colors"><Phone size={20} /></button>
            <button className="p-2 text-outline hover:text-primary transition-colors"><Video size={20} /></button>
            <button className="p-2 text-outline hover:text-primary transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-center">
            <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-[10px] font-bold text-outline uppercase tracking-widest">Aujourd'hui</span>
          </div>
          
          <div className="flex flex-col gap-1 items-start max-w-[80%]">
            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-on-surface-variant leading-relaxed">
              Bonjour Dr. Almanar, est-ce que mes résultats d'analyses de sang de ce matin sont déjà disponibles ?
            </div>
            <span className="text-[10px] text-outline ml-1">14:15</span>
          </div>

          <div className="flex flex-col gap-2 items-end ml-auto max-w-[80%]">
            <div className="bg-primary text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-md text-sm leading-relaxed relative">
              Bonjour Asmae. Oui, vos résultats ont été validés par le biologiste. Tout semble normal. Je vous joins le rapport complet ci-dessous.
              <div className="absolute -left-28 top-0">
                <span className="bg-tertiary-container text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-sm flex items-center gap-1">
                  <Sparkles size={12} fill="currentColor" />
                  AI ANALYZED
                </span>
              </div>
            </div>
            <div className="w-72 bg-white/60 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 border border-white/40 hover:bg-white transition-colors cursor-pointer group shadow-sm">
              <div className="w-10 h-10 bg-error-container text-error rounded-lg flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">Resultats_Bermi_Asmae.pdf</p>
                <p className="text-[10px] text-outline font-medium">1.2 MB • PDF</p>
              </div>
              <button className="text-outline group-hover:text-primary transition-colors">
                <Download size={18} />
              </button>
            </div>
            <span className="text-[10px] text-outline mr-1 flex items-center gap-1">
              14:22 <span className="text-primary">✓✓</span>
            </span>
          </div>
        </div>

        <div className="p-6 pt-2 bg-gradient-to-t from-surface-container-low to-transparent">
          {attachment && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-white/80 backdrop-blur-md rounded-xl border border-primary/20 shadow-sm animate-in slide-in-from-bottom-2">
              <div className="w-10 h-10 bg-error-container text-error rounded-lg flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">{attachment}</p>
                <p className="text-[10px] text-outline font-medium">Prêt à être envoyé</p>
              </div>
              <button 
                onClick={() => setAttachment(null)}
                className="p-1.5 text-outline hover:text-error transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {['Envoyer résultats', 'Proposer RDV', 'Rappel paiement'].map((btn, i) => (
              <button key={i} className="px-4 py-2 bg-white/60 text-primary text-xs font-bold rounded-lg border border-primary/10 hover:bg-primary hover:text-white transition-all whitespace-nowrap">
                {btn}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4 bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl shadow-primary/5">
            <div className="flex items-center gap-3">
              <button className="p-2 text-outline hover:text-primary transition-colors"><Plus size={20} /></button>
              <input 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-outline" 
                placeholder="Écrire un message..." 
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Send size={18} />
              </button>
            </div>
            <div className="h-[1px] bg-surface-container"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" fill="currentColor" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Assistant IA</span>
              </div>
              <div className="w-9 h-5 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Internal Notes (Assistant Only) */}
          <div className={cn(
            "mt-4 bg-amber-50/80 backdrop-blur-md border border-amber-200/50 rounded-2xl p-4 shadow-sm transition-all duration-300",
            isNotesMinimized ? "p-3" : "p-4"
          )}>
            <div className={cn("flex items-center justify-between", !isNotesMinimized && "mb-3")}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center text-white shadow-sm shadow-amber-200">
                  <StickyNote size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest leading-none">Notes Internes</span>
                  {!isNotesMinimized && <span className="text-[8px] text-amber-600 font-medium mt-0.5">Visibles uniquement par l'équipe</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsNotesMinimized(!isNotesMinimized)}
                  className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors" 
                  title={isNotesMinimized ? "Agrandir" : "Réduire"}
                >
                  {isNotesMinimized ? <Plus size={14} /> : <Minus size={14} />}
                </button>
                {!isNotesMinimized && (
                  <>
                    <button className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors" title="Historique des notes">
                      <History size={14} />
                    </button>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded border border-amber-200 uppercase">Assistant</span>
                  </>
                )}
              </div>
            </div>
            
            {!isNotesMinimized && (
              <>
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">SA</div>
                    <div className="flex-1">
                      <p className="text-xs text-amber-900 leading-relaxed font-medium">
                        "Le patient a demandé un duplicata de sa facture 2023. Je lui ai dit que ce sera prêt demain matin."
                      </p>
                      <span className="text-[9px] text-amber-600/70 font-bold mt-1 block">Sanae A. • Il y a 2h</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ajouter une remarque interne pour le prochain shift..." 
                    className="w-full bg-white/50 border border-amber-200 rounded-xl py-2 pl-3 pr-10 text-xs text-amber-900 placeholder:text-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Patient Info Sidebar */}
      <section className="w-1/4 bg-white flex flex-col p-0 overflow-y-auto border-l border-surface-container">
        {/* PART 1: PROFIL */}
        <div className="p-6 border-b border-surface-container">
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            <div className="relative">
              <img alt="Asmae Bermi" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-surface-container-low" src="https://picsum.photos/seed/patient1/200/200" referrerPolicy="no-referrer" />
              <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full", getStatusColor('en_cours'))}></div>
            </div>
            <div>
              <h3 className="font-headline font-extrabold text-xl text-on-surface leading-tight">Asmae Bermi</h3>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={cn("w-2 h-2 rounded-full", getStatusColor('en_cours'))}></span>
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">{getStatusText('en_cours')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Profil Patient</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-surface-container/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <User size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-outline uppercase font-bold leading-none mb-1">ID & CIN</span>
                  <span className="text-xs font-bold text-on-surface">#ALM-98234 • CIN: BE123456</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-surface-container/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Smartphone size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-outline uppercase font-bold leading-none mb-1">Téléphone</span>
                  <span className="text-xs font-bold text-on-surface">+212 6 61 23 45 67</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-surface-container/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Mail size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-outline uppercase font-bold leading-none mb-1">Email</span>
                  <span className="text-xs font-bold text-on-surface">a.bermi@email.com</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-surface-container/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-outline uppercase font-bold leading-none mb-1">Date Naissance</span>
                  <span className="text-xs font-bold text-on-surface">12/05/1992 (33 ans)</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-surface-container/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-outline uppercase font-bold leading-none mb-1">Adresse</span>
                  <span className="text-xs font-bold text-on-surface truncate">Hay Riad, Secteur 12, Rabat</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-surface rounded-xl border border-surface-container/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-outline uppercase font-bold leading-none mb-1">Couverture</span>
                  <span className="text-xs font-bold text-on-surface">CNOPS (80%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PART 2: ANALYSES EN COURS */}
        <div className="p-6 border-b border-surface-container bg-surface/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest">Analyses en cours</h4>
            </div>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">2</span>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Bilan Hématologique', date: '28/03/26 09:15', id: 'ANA-4421' },
              { name: 'Glycémie à jeun', date: '28/03/26 09:15', id: 'ANA-4422' }
            ].map((ana, i) => (
              <div key={i} className="p-3 bg-white rounded-xl border border-surface-container flex justify-between items-center group cursor-pointer hover:border-amber-200 transition-all">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">{ana.name}</span>
                  <span className="text-[10px] text-outline mt-0.5">{ana.date} • {ana.id}</span>
                </div>
                <ChevronRight size={14} className="text-outline group-hover:text-amber-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* PART 3: RÉSULTATS PRÊTS */}
        <div className="p-6 bg-green-50/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-green-600" />
              <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest">Résultats Prêts</h4>
            </div>
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded">3</span>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Bilan Lipidique', date: '25/03/26 11:30', id: 'ANA-4310' },
              { name: 'Test PCR COVID-19', date: '20/03/26 15:45', id: 'ANA-4288' },
              { name: 'Analyse d\'urine', date: '15/03/26 10:20', id: 'ANA-4155' }
            ].map((res, i) => (
              <div key={i} className="p-3 bg-white rounded-xl border border-surface-container flex justify-between items-center group cursor-pointer hover:border-green-200 transition-all">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">{res.name}</span>
                  <span className="text-[10px] text-outline mt-0.5">{res.date} • {res.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download size={14} className="text-outline group-hover:text-green-600 transition-colors" />
                  <ChevronRight size={14} className="text-outline group-hover:text-green-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
