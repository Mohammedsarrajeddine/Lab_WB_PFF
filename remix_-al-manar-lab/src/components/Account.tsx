import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  ShieldCheck,
  Smartphone,
  Laptop,
  Monitor,
  UserPlus,
  MoreVertical,
  Pencil,
  ChevronRight,
  CheckCircle2,
  Briefcase,
  Fingerprint,
  FlaskConical,
  Headset,
  Microscope,
  Info,
  Filter,
  Download
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Account: React.FC = () => {
  const teamMembers = [
    { name: 'Ahmed Rami', role: 'Assistant Labo', status: 'Actif', lastAccess: 'Il y a 10 min', avatar: 'https://picsum.photos/seed/ahmed/100/100' },
    { name: 'Leila Benjelloun', role: 'Secrétaire', status: 'Actif', lastAccess: 'Hier, 16:45', avatar: 'https://picsum.photos/seed/leila/100/100' },
  ];

  const connections = [
    { device: 'MacBook Pro', location: 'Casablanca, Maroc', ip: '192.168.1.1', status: 'CETTE SESSION', current: true, icon: Laptop },
    { device: 'iPhone 15', location: 'Rabat, Maroc', ip: '105.158.24.12', lastSeen: 'Dernière activité: Il y a 2h', icon: Smartphone },
    { device: 'Windows PC', location: 'Casablanca, Maroc', ip: '192.168.1.15', lastSeen: 'Dernière activité: 12 Nov 2024', icon: Monitor },
  ];

  const roles = [
    { 
      title: 'Admin Principal', 
      description: 'Contrôle total sur les systèmes, configurations financières et accès.', 
      icon: ShieldCheck,
      color: 'bg-slate-900',
      iconColor: 'text-white'
    },
    { 
      title: 'Chef Labo', 
      description: 'Validation des analyses critiques et gestion des stocks.', 
      icon: FlaskConical,
      color: 'bg-blue-600',
      iconColor: 'text-white'
    },
    { 
      title: 'Assistant', 
      description: 'Gestion des rendez-vous, accueil et envois WhatsApp.', 
      icon: Headset,
      color: 'bg-blue-400',
      iconColor: 'text-white'
    },
    { 
      title: 'Analyste', 
      description: 'Saisie des résultats et configuration des protocoles techniques.', 
      icon: Microscope,
      color: 'bg-teal-600',
      iconColor: 'text-white'
    },
  ];

  const journalEntries = [
    { time: "Aujourd'hui, 10:45", patient: "Ahmed Zerouali", type: "Résultat d'analyse", status: "ENVOYÉ" },
    { time: "Aujourd'hui, 10:32", patient: "Leila Amrani", type: "Validation automatique", status: "ENVOYÉ" },
    { time: "Aujourd'hui, 09:15", patient: "Yassine El Fassi", type: "Rappel RDV", status: "ÉCHEC" },
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-outline mb-4">
        <span>Accueil</span>
        <ChevronRight size={10} />
        <span className="text-primary">Compte</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Gestion du Compte</h2>
          <p className="text-on-surface-variant mt-1 font-body text-lg">Gérez vos informations personnelles, la sécurité et les accès de votre équipe.</p>
        </div>
        <button className="btn-primary-gradient flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
          <Pencil size={18} />
          <span>Modifier le profil</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-surface-container flex flex-col items-center text-center sticky top-24">
            <div className="relative mb-6">
              <div className="w-40 h-40 rounded-[40px] overflow-hidden ring-8 ring-primary/5 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                <img 
                  src="https://picsum.photos/seed/sarah/400/400" 
                  alt="Sarah Mansouri" 
                  className="w-full h-full object-cover -rotate-3 hover:rotate-0 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-on-surface font-headline mb-1">Sarah Mansouri</h3>
            <p className="text-on-surface-variant font-medium mb-4">s.mansouri@almanar-lab.ma</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
                Admin Principal
              </span>
              <span className="px-4 py-1.5 bg-tertiary/10 text-tertiary rounded-full text-[10px] font-bold uppercase tracking-widest">
                Chef de Laboratoire
              </span>
            </div>
            
            <div className="w-full space-y-6 text-left">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Nom Complet</p>
                <p className="font-bold text-on-surface">Sarah Mansouri</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Téléphone</p>
                <p className="font-bold text-on-surface">+212 6 00 00 00 00</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Spécialité</p>
                <p className="font-bold text-on-surface">Biologie Clinique</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest">CIN/ID PRO</p>
                <p className="font-bold text-on-surface">ALM-2024-089</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Security & Team */}
        <div className="lg:col-span-8 space-y-8">
          {/* Security Section */}
          <div className="bg-primary/5 rounded-[32px] p-8 border border-primary/10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-on-surface font-headline">Sécurité Active</h4>
                  <p className="text-sm text-on-surface-variant">Protection du compte et authentification</p>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-white text-primary font-bold text-sm rounded-xl shadow-sm hover:bg-primary hover:text-white transition-all">
                Changer mot de passe
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 flex items-center justify-between shadow-sm border border-surface-container">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Authentification à deux facteurs (2FA)</p>
                  <p className="text-xs text-on-surface-variant">Activée via Google Authenticator</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-tertiary/10 text-tertiary rounded-full text-[10px] font-bold uppercase tracking-widest">
                Actif
              </span>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xl font-bold text-on-surface font-headline">Membres de l'équipe</h4>
              <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <UserPlus size={18} />
                <span>Inviter un assistant</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-surface-container">
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-widest">Membre</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-widest">Rôle</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-widest">Dernier Accès</th>
                    <th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {teamMembers.map((member, i) => (
                    <tr key={i} className="group hover:bg-surface-container-lowest transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                          <span className="font-bold text-on-surface">{member.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-on-surface-variant">{member.role}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                          <span className="text-sm font-medium text-on-surface">{member.status}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-on-surface-variant">{member.lastAccess}</td>
                      <td className="py-4 text-right">
                        <button className="p-2 hover:bg-surface-container rounded-lg text-outline transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Connection History */}
      <section className="mt-12 bg-primary/5 rounded-[40px] p-10 border border-primary/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h4 className="text-2xl font-bold text-on-surface font-headline">Historique des connexions</h4>
            <p className="text-on-surface-variant mt-1">Sessions actives sur d'autres appareils</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-surface-container">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20">
              <Shield size={16} />
              <span>Administrateur</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 text-on-surface-variant hover:text-primary transition-colors text-sm font-bold">
              <User size={16} />
              <span>Assistant</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {connections.map((conn, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container group hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <conn.icon size={24} />
                </div>
                {conn.status && (
                  <span className="px-3 py-1 bg-tertiary/10 text-tertiary rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {conn.status}
                  </span>
                )}
              </div>
              <h5 className="text-xl font-bold text-on-surface mb-1">{conn.device}</h5>
              <p className="text-sm text-on-surface-variant mb-4">{conn.location} • {conn.ip}</p>
              {conn.current ? (
                <p className="text-sm font-bold text-primary flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Connecté maintenant
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant">{conn.lastSeen}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rôles & Permissions Section */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-3xl font-bold text-on-surface font-headline">Rôles & Permissions</h4>
          <button className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
            Voir tous les utilisateurs <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role, i) => (
            <div key={i} className="bg-indigo-50/50 rounded-[32px] p-8 border border-indigo-100/50 flex flex-col items-start text-left group hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg", role.color, role.iconColor)}>
                <role.icon size={28} />
              </div>
              <h5 className="text-xl font-bold text-on-surface mb-3">{role.title}</h5>
              <p className="text-sm text-on-surface-variant leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journalisation Section */}
      <section className="mt-12 bg-white rounded-[40px] p-10 shadow-sm border border-surface-container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h4 className="text-3xl font-bold text-on-surface font-headline">Journalisation</h4>
            <p className="text-on-surface-variant mt-1">Suivi des communications WhatsApp en temps réel.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-surface-container-low text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container transition-colors">
              <Filter size={18} />
              <span>Filtrer</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-surface-container-low text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container transition-colors">
              <Download size={18} />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-6 text-[10px] font-bold text-outline uppercase tracking-widest">Horodatage</th>
                <th className="pb-6 text-[10px] font-bold text-outline uppercase tracking-widest">Patient</th>
                <th className="pb-6 text-[10px] font-bold text-outline uppercase tracking-widest">Type d'envoi</th>
                <th className="pb-6 text-[10px] font-bold text-outline uppercase tracking-widest text-center">Statut</th>
                <th className="pb-6 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {journalEntries.map((entry, i) => (
                <tr key={i} className="group hover:bg-surface-container-lowest transition-colors">
                  <td className="py-6 text-sm text-on-surface-variant">{entry.time}</td>
                  <td className="py-6 font-bold text-on-surface">{entry.patient}</td>
                  <td className="py-6 text-sm text-on-surface-variant">{entry.type}</td>
                  <td className="py-6">
                    <div className="flex justify-center">
                      <span className={cn(
                        "px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        entry.status === 'ENVOYÉ' ? 'bg-tertiary-container/20 text-tertiary' : 'bg-orange-100 text-orange-600'
                      )}>
                        {entry.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-6 text-right">
                    <button className="p-2 bg-surface-container-low text-outline rounded-full hover:bg-primary hover:text-white transition-all">
                      <Info size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
