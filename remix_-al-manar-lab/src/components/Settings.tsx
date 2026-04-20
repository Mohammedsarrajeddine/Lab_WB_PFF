import React from 'react';
import { 
  Sparkles, 
  MessageCircle, 
  Bell, 
  ShieldCheck, 
  Clock, 
  Save, 
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Settings: React.FC = () => {
  return (
    <div className="animate-in fade-in duration-500">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Paramètres Assistant IA</h2>
          <p className="text-on-surface-variant mt-1 font-body">Configurez l'intelligence artificielle et l'automatisation</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-surface-container-highest text-on-surface font-bold rounded-xl flex items-center gap-2 hover:bg-surface-container-high transition-colors">
            <X size={20} />
            ANNULER
          </button>
          <button className="px-6 py-3 btn-primary-gradient text-white font-bold rounded-xl flex items-center gap-2">
            <Save size={20} />
            ENREGISTRER
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="tonal-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles size={24} fill="currentColor" />
              </div>
              <h3 className="font-headline font-bold text-xl">Configuration Assistant</h3>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                <div>
                  <p className="font-bold text-on-surface">Activer l'Assistant IA</p>
                  <p className="text-xs text-on-surface-variant">L'IA répondra automatiquement aux questions fréquentes sur WhatsApp.</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">Heures d'activité</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-surface-container-low p-3 rounded-xl flex items-center gap-2">
                      <Clock size={16} className="text-outline" />
                      <span className="text-sm font-semibold">08:00</span>
                    </div>
                    <span className="text-outline font-bold">à</span>
                    <div className="flex-1 bg-surface-container-low p-3 rounded-xl flex items-center gap-2">
                      <Clock size={16} className="text-outline" />
                      <span className="text-sm font-semibold">20:00</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">Statut WhatsApp</label>
                  <div className="bg-tertiary-container/10 border border-tertiary/10 p-3 rounded-xl flex items-center gap-3">
                    <div className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-tertiary">Connecté (API Officielle)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">Notifications de l'Assistant</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Alerte si l\'IA ne peut pas répondre',
                    'Résumé quotidien des interactions',
                    'Notification sur analyses critiques',
                    'Confirmation d\'envoi des résultats'
                  ].map((notif, i) => (
                    <label key={i} className="flex items-center gap-3 p-4 border border-surface-container rounded-2xl cursor-pointer hover:bg-surface-container-low transition-colors">
                      <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors", i < 2 ? "bg-primary border-primary" : "border-outline-variant")}>
                        {i < 2 && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium text-on-surface-variant">{notif}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="tonal-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MessageCircle size={24} />
              </div>
              <h3 className="font-headline font-bold text-xl">Modèles de Messages</h3>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Envoi de Résultats', desc: 'Bonjour [Nom], vos résultats pour [Analyse] sont prêts...' },
                { title: 'Rappel de RDV', desc: 'Bonjour [Nom], nous vous rappelons votre RDV demain à...' },
                { title: 'Confirmation de Prélèvement', desc: 'Votre prélèvement #ID a bien été reçu au laboratoire...' }
              ].map((tpl, i) => (
                <div key={i} className="p-4 bg-surface-container-low rounded-2xl group cursor-pointer hover:bg-surface-container transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-on-surface">{tpl.title}</p>
                    <button className="text-primary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">MODIFIER</button>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-1">{tpl.desc}</p>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-outline-variant rounded-2xl text-outline text-xs font-bold hover:border-primary hover:text-primary transition-all">
                + AJOUTER UN MODÈLE
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-surface-container-low rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck size={24} className="text-primary" />
              <h3 className="font-headline font-bold text-lg">Sécurité</h3>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-bold text-outline uppercase tracking-widest">Double Authentification</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface-variant">Activé (SMS)</span>
                  <button className="text-primary text-xs font-bold">CONFIGURER</button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-outline uppercase tracking-widest">Expiration de Session</p>
                <select className="w-full bg-white border-none rounded-xl text-sm font-medium p-3 focus:ring-2 focus:ring-primary/20">
                  <option>Après 30 minutes</option>
                  <option>Après 1 heure</option>
                  <option>Après 4 heures</option>
                </select>
              </div>
            </div>
          </section>

          <div className="p-6 bg-primary text-white rounded-3xl space-y-4 shadow-xl shadow-primary/20">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">Mise à jour</span>
            </div>
            <p className="text-sm font-bold leading-tight">Une nouvelle version de l'Assistant IA est disponible (v4.3.1).</p>
            <button className="w-full py-3 bg-white text-primary rounded-xl text-xs font-bold hover:bg-white/90 transition-colors">
              METTRE À JOUR MAINTENANT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
