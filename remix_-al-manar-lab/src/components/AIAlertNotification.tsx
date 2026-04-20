import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, MessageSquare, X, Minus, Maximize2, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

interface AlertItem {
  id: string;
  patientName: string;
  timestamp: Date;
}

interface AIAlertNotificationProps {
  onRedirect: (tab: string) => void;
  onSendToWhatsApp?: (patientName: string, message: string) => void;
}

export const AIAlertNotification: React.FC<AIAlertNotificationProps> = ({ onRedirect, onSendToWhatsApp }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update "now" every minute to refresh relative times
    const interval = setInterval(() => setNow(new Date()), 60000);
    
    // Simulate first alert
    const timer1 = setTimeout(() => {
      setAlerts(prev => [...prev, {
        id: '1',
        patientName: "Asmae Bermi",
        timestamp: new Date()
      }]);
    }, 8000);

    // Simulate second alert
    const timer2 = setTimeout(() => {
      setAlerts(prev => [...prev, {
        id: '2',
        patientName: "Karim Tazi",
        timestamp: new Date()
      }]);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts([]);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handleRemoveAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleClickPatient = (patientName: string) => {
    if (onSendToWhatsApp) {
      onSendToWhatsApp(patientName, `Bonjour ${patientName}, je vous contacte concernant l'alerte critique sur vos résultats.`);
    } else {
      onRedirect('whatsapp');
    }
    // In a real app, we'd navigate to the specific chat
    // For now, we just remove the alert as if it's "handled"
    setAlerts(prev => prev.filter(a => a.patientName !== patientName));
  };

  const getTimeElapsed = (date: Date) => {
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return "à l'instant";
    return `il y a ${diff}min`;
  };

  if (alerts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          x: 0,
          rotate: isMinimized ? 0 : [0, -2, 2, -2, 2, 0],
        }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 20,
          rotate: {
            duration: 0.4,
            repeat: isMinimized ? 0 : 2,
            repeatType: "mirror",
            delay: 0.5
          }
        }}
        className={cn(
          "fixed bottom-8 right-8 z-[100] transition-all duration-300",
          isMinimized ? "w-16 h-16" : "w-96"
        )}
      >
        {isMinimized ? (
          <button 
            onClick={() => setIsMinimized(false)}
            className="w-16 h-16 bg-error rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform relative group"
          >
            <Bell size={24} className="animate-bounce" />
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-error text-[10px] font-black rounded-full flex items-center justify-center border-2 border-error">
              {alerts.length}
            </span>
            <div className="absolute right-full mr-4 bg-on-surface text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {alerts.length} alertes en attente
            </div>
          </button>
        ) : (
          <div className="relative bg-white rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-error/10 overflow-hidden">
            {/* Header */}
            <div className="bg-error/5 px-6 py-4 border-b border-error/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-error rounded-lg flex items-center justify-center text-white shadow-lg shadow-error/20">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-primary" fill="currentColor" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Assistant IA</span>
                  </div>
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">Alertes Critiques ({alerts.length})</h4>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleMinimize}
                  className="p-1.5 text-outline hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                  title="Réduire"
                >
                  <Minus size={16} />
                </button>
                <button 
                  onClick={handleClose}
                  className="p-1.5 text-outline hover:text-error transition-colors rounded-lg hover:bg-error/5"
                  title="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto no-scrollbar">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <motion.div 
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group bg-surface-container-low hover:bg-white p-4 rounded-2xl border border-transparent hover:border-error/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => handleClickPatient(alert.patientName)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error shrink-0">
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-variant font-medium mb-1">
                            Intervention requise pour :
                          </p>
                          <h5 className="text-sm font-black text-on-surface leading-none mb-1.5">
                            {alert.patientName}
                          </h5>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-outline font-bold flex items-center gap-1">
                              <AlertCircle size={10} />
                              {getTimeElapsed(alert.timestamp)}
                            </span>
                            <span className="w-1 h-1 bg-outline rounded-full"></span>
                            <span className="text-[10px] text-primary font-black uppercase tracking-widest">WhatsApp</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleRemoveAlert(alert.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-error transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer / Urgency Indicator */}
            <div className="bg-surface-container-low px-6 py-3 border-t border-surface-container flex items-center justify-between">
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest">Mode : Assistance Humaine</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-error uppercase tracking-widest">En direct</span>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 h-1 bg-error/10 w-full">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                className="h-full bg-error shadow-[0_0_10px_rgba(255,68,68,0.5)]"
              />
            </div>
          </div>
        )}
        
        {/* Floating Badge (only when not minimized) */}
        {!isMinimized && (
          <div className="absolute -top-3 -left-3 bg-error text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white z-20 animate-bounce">
            {alerts.length} URGENT
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
