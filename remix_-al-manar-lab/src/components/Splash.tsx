import React from 'react';
import { Microscope, ShieldCheck, FlaskConical } from 'lucide-react';
import { motion } from 'motion/react';

interface SplashProps {
  onComplete: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <main className="relative h-screen w-full flex flex-col items-center justify-center bg-surface-container-lowest overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[80px]"></div>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center z-10"
      >
        <div className="mb-8 flex items-center justify-center w-28 h-28 rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-surface-container">
          <Microscope className="text-primary" size={64} />
        </div>
        <div className="text-center space-y-2">
          <h1 className="font-headline font-extrabold text-5xl tracking-tight text-on-surface">
            AL MANAR LAB
          </h1>
          <p className="font-label text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">
            Laboratoire d'analyses médicales
          </p>
        </div>

        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-surface-container-high"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="226.19"
                initial={{ strokeDashoffset: 226.19 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
                className="text-primary"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">v4.2.0</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Initialisation du système</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1 h-1 rounded-full bg-primary"
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <footer className="absolute bottom-12 left-0 w-full px-8 flex justify-center z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 opacity-60">
            <ShieldCheck className="text-primary" size={16} />
            <span className="text-[10px] text-on-surface font-semibold uppercase tracking-wider">Secure Access</span>
          </div>
          <div className="w-1 h-1 bg-outline-variant rounded-full"></div>
          <div className="flex items-center gap-2 opacity-60">
            <FlaskConical className="text-primary" size={16} />
            <span className="text-[10px] text-on-surface font-semibold uppercase tracking-wider">Lab Ready</span>
          </div>
        </div>
      </footer>
    </main>
  );
};
