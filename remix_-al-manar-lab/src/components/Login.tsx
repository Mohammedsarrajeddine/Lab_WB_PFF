import React from 'react';
import { Microscope, ShieldCheck, Lock, Shield, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <main className="bg-background min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-tertiary/5 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl shadow-sm mb-4">
            <Microscope className="text-primary" size={40} />
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-primary tracking-tight">AL MANAR LAB</h1>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mt-1">Laboratoire d'analyses médicales</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8 md:p-10">
          <header className="mb-8">
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Connexion</h2>
            <p className="text-on-surface-variant text-sm">Accédez à votre tableau de bord clinique sécurisé.</p>
          </header>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
            <div className="space-y-1.5">
              <label className="font-label text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">Adresse e-mail</label>
              <input 
                className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-on-surface placeholder:text-outline-variant transition-all" 
                id="email" 
                placeholder="nom@almanarlab.com" 
                required 
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="font-label text-sm font-semibold text-on-surface-variant" htmlFor="password">Mot de passe</label>
                <a className="text-primary text-xs font-semibold hover:underline" href="#">Mot de passe oublié?</a>
              </div>
              <input 
                className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-on-surface placeholder:text-outline-variant transition-all" 
                id="password" 
                placeholder="••••••••" 
                required 
                type="password"
              />
            </div>

            <div className="flex gap-3 p-3 bg-surface-container-low rounded-lg items-start">
              <ShieldCheck className="text-primary shrink-0" size={20} />
              <p className="text-[11px] leading-relaxed text-on-surface-variant">
                <strong>Sécurité 2FA :</strong> Une fois connecté, un code de validation pourra vous être demandé si vous utilisez un nouvel appareil.
              </p>
            </div>

            <button className="btn-primary-gradient w-full py-4 rounded-lg text-white font-headline font-bold text-base shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all" type="submit">
              Se connecter
            </button>
          </form>

          <footer className="mt-10 pt-8 border-t border-surface-container flex flex-col items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                <Lock size={20} />
                <span className="text-[10px] font-bold tracking-widest uppercase">SSL Secure</span>
              </div>
              <div className="flex flex-col items-center gap-1 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                <Shield size={20} />
                <span className="text-[10px] font-bold tracking-widest uppercase">GDPR Ready</span>
              </div>
              <div className="flex flex-col items-center gap-1 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                <ShieldCheck size={20} />
                <span className="text-[10px] font-bold tracking-widest uppercase">HDS Cert</span>
              </div>
            </div>
          </footer>
        </div>

        <p className="text-center mt-8 text-on-surface-variant text-sm">
          Besoin d'assistance ? <a className="text-primary font-semibold hover:underline" href="#">Contactez le support technique</a>
        </p>
      </motion.div>
    </main>
  );
};
