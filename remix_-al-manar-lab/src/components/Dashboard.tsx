import React from 'react';
import { 
  Users, 
  UserPlus, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Bot, 
  Plus, 
  Microscope, 
  FileText,
  TrendingUp,
  CheckCircle2,
  BellRing,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const kpis = [
    { label: 'Total Patients', value: '12,842', icon: Users, color: 'text-primary', bg: 'bg-blue-50', progress: 75 },
    { label: 'Nouveaux ce mois', value: '+148', sub: 'depuis le 1er', icon: UserPlus, color: 'text-tertiary', bg: 'bg-green-50', bars: [1, 1, 0.2] },
    { label: 'Analyses en cours', value: '34', sub: 'en laboratoire', icon: Clock, color: 'text-primary-container', bg: 'bg-blue-50', avatars: 3 },
    { label: 'Urgences', value: '03', sub: 'Action immédiate requise', icon: AlertTriangle, color: 'text-error', bg: 'bg-error-container', urgent: true },
    { label: 'WhatsApp Envoyés', value: '142', sub: '100% Délivrés', icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-100', progress: 100 },
    { label: 'Traités par Chatbot IA', value: '67%', sub: 'Automatisation du support', icon: Bot, color: 'text-primary', bg: 'bg-primary/10', trend: true },
  ];

  const activities = [
    { id: 1, type: 'whatsapp', title: 'Résultat envoyé à Samira Jabri', time: 'Il y a 2 minutes', meta: 'WhatsApp API', icon: MessageSquare, iconColor: 'text-tertiary' },
    { id: 2, type: 'urgent', title: 'Nouvelle analyse urgente : #9421', time: 'En attente de prélèvement', meta: 'PRIORITÉ MAX', icon: AlertTriangle, iconColor: 'text-error', bg: 'bg-error-container' },
    { id: 3, type: 'report', title: 'Rapport hebdomadaire prêt', time: 'Généré automatiquement', meta: 'Système', icon: FileText, iconColor: 'text-primary' },
    { id: 4, type: 'patient', title: 'Nouveau patient enregistré', time: 'Ahmed Benali', meta: 'Dossier #10842', icon: UserPlus, iconColor: 'text-slate-400' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-[24px] font-extrabold text-on-surface font-headline leading-tight">Bonjour, Dr. Sarah Mansouri</h2>
          <p className="text-on-surface-variant mt-1 text-sm font-body">Voici l'état actuel de votre laboratoire pour aujourd'hui.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-surface-container-highest text-on-surface text-sm font-semibold rounded-xl flex items-center gap-2 hover:bg-surface-container-high transition-colors">
            <Plus size={18} />
            Nouveau Patient
          </button>
          <button className="px-5 py-2.5 bg-surface-container-highest text-on-surface text-sm font-semibold rounded-xl flex items-center gap-2 hover:bg-surface-container-high transition-colors">
            <Microscope size={18} />
            Nouvelle Analyse
          </button>
          <button className="px-6 py-2.5 btn-primary-gradient text-white text-sm font-bold rounded-xl flex items-center gap-2">
            <FileText size={18} />
            Générer Rapport
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "tonal-card p-6 flex flex-col justify-between",
              kpi.urgent && "border-l-4 border-error"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", kpi.bg, kpi.color)}>
                <kpi.icon size={20} fill={kpi.urgent ? "currentColor" : "none"} />
              </div>
              <span className="text-[11px] font-bold text-outline tracking-wider uppercase font-label">{kpi.label}</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-extrabold font-headline", kpi.color && !kpi.trend && kpi.color)}>{kpi.value}</span>
                {kpi.sub && <span className="text-xs font-medium text-on-surface-variant font-body">{kpi.sub}</span>}
                {kpi.trend && <TrendingUp size={14} className="text-primary" />}
              </div>
              {kpi.progress !== undefined && (
                <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", kpi.progress === 100 ? "bg-tertiary" : "bg-primary")} style={{ width: `${kpi.progress}%` }} />
                </div>
              )}
              {kpi.bars && (
                <div className="mt-4 flex gap-1">
                  {kpi.bars.map((b, idx) => (
                    <div key={idx} className="h-1 flex-1 rounded-full bg-tertiary" style={{ opacity: b }} />
                  ))}
                </div>
              )}
              {kpi.avatars && (
                <div className="mt-4 flex -space-x-2">
                  {[1, 2].map(a => (
                    <div key={a} className="w-6 h-6 rounded-full border-2 border-white bg-surface-container" />
                  ))}
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-surface-container-highest flex items-center justify-center text-[8px] font-bold text-on-surface">+31</div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 tonal-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-headline font-bold text-lg">Productivité du Laboratoire</h3>
              <p className="text-sm text-on-surface-variant font-body">Analyse hebdomadaire des prélèvements</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-bold border border-outline-variant rounded-lg text-on-surface-variant">Semaine</button>
              <button className="px-3 py-1 text-xs font-bold bg-primary text-white rounded-lg">Mois</button>
            </div>
          </div>
          <div className="relative h-64 flex items-end gap-4 px-2">
            {[40, 65, 55, 85, 95, 30, 15].map((h, i) => (
              <div key={i} className="flex-1 bg-primary/5 rounded-t-xl relative group" style={{ height: `${h}%` }}>
                <div className={cn(
                  "absolute inset-x-0 bottom-0 bg-primary/20 rounded-t-xl group-hover:bg-primary/40 transition-all",
                  i === 4 && "bg-primary/40 group-hover:bg-primary/60"
                )} style={{ height: '100%' }} />
                <span className="absolute -bottom-6 inset-x-0 text-[10px] font-bold text-outline text-center">
                  {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-low rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline font-bold text-lg">Activités Récentes</h3>
            <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-full text-on-surface-variant shadow-sm">TEMPS RÉEL</span>
          </div>
          <div className="space-y-6">
            {activities.map((act) => (
              <div key={act.id} className="flex gap-4">
                <div className="relative">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm", act.bg || "bg-white")}>
                    <act.icon size={18} className={act.iconColor} />
                  </div>
                  {act.type === 'whatsapp' && <div className="absolute top-0 right-0 w-3 h-3 bg-tertiary-fixed-dim rounded-full border-2 border-surface-container-low" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{act.title}</p>
                  <p className={cn("text-[11px] mt-1", act.type === 'urgent' ? "text-error font-medium" : "text-on-surface-variant")}>
                    {act.time} • {act.meta}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-xs font-bold text-primary hover:bg-white rounded-xl transition-colors">
            VOIR TOUT LE JOURNAL
          </button>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <button className="h-14 w-14 rounded-full glass-panel shadow-2xl flex items-center justify-center group">
          <div className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-4 ring-background">2</div>
          <Sparkles className="text-primary group-hover:scale-110 transition-transform" fill="currentColor" />
        </button>
      </div>
    </div>
  );
};
