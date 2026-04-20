import React, { useState } from 'react';
import { 
  Send, 
  Paperclip, 
  Sparkles,
  Bot,
  User,
  MoreVertical,
  Search,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: 'Bonjour Sarah ! Je suis votre assistant IA AL MANAR LAB. Comment puis-je vous aider aujourd\'hui ?', time: '09:00' },
    { id: 2, role: 'user', text: 'Peux-tu me donner un résumé des analyses urgentes ?', time: '09:05' },
    { id: 3, role: 'bot', text: 'Bien sûr. Il y a actuellement 3 analyses en attente de validation urgente :\n1. Asmae Bermi (Bilan Hématologique)\n2. Karim Mansouri (Glycémie)\n3. Leila Ben (Thyroïde)', time: '09:06' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = { id: Date.now(), role: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages([...messages, newMessage]);
    setInput('');
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: "Je traite votre demande. Souhaitez-vous que j'alerte le biologiste de garde ?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -m-8 overflow-hidden animate-in fade-in duration-500">
      {/* History Sidebar */}
      <section className="w-1/4 flex flex-col bg-surface border-r border-surface-container">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-lg text-on-surface">Conversations</h2>
            <button className="p-2 bg-primary-container text-white rounded-lg hover:opacity-90 transition-opacity">
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-xs focus:ring-2 focus:ring-primary/20" 
              placeholder="Rechercher..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 px-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 text-primary cursor-pointer">
            <MessageSquare size={18} />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs truncate">Résumé des analyses</h4>
              <p className="text-[10px] opacity-70 truncate">Aujourd'hui, 09:06</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-lowest cursor-pointer text-on-surface-variant">
            <MessageSquare size={18} />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs truncate">Aide protocole COVID</h4>
              <p className="text-[10px] opacity-70 truncate">Hier, 16:45</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <section className="flex-1 flex flex-col bg-surface-container-low relative">
        <div className="h-16 px-6 flex items-center justify-between bg-white/40 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Bot size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-sm">Chatbot IA</span>
              <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span> Prêt à vous aider
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-outline hover:text-primary transition-colors"><Search size={20} /></button>
            <button className="p-2 text-outline hover:text-primary transition-colors"><Trash2 size={20} /></button>
            <button className="p-2 text-outline hover:text-primary transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col gap-1 max-w-[80%]",
                msg.role === 'user' ? "items-end ml-auto" : "items-start"
              )}
            >
              <div className={cn(
                "px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-white text-on-surface-variant rounded-tl-none"
              )}>
                {msg.text.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <span className="text-[10px] text-outline px-1">{msg.time}</span>
            </div>
          ))}
        </div>

        <div className="p-6 pt-2 bg-gradient-to-t from-surface-container-low to-transparent">
          <div className="flex flex-col gap-4 bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl shadow-primary/5">
            <div className="flex items-center gap-3">
              <button className="p-2 text-outline hover:text-primary transition-colors"><Paperclip size={20} /></button>
              <input 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-outline" 
                placeholder="Posez une question à l'IA..." 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="h-[1px] bg-surface-container"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" fill="currentColor" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Assistant IA Actif</span>
              </div>
              <div className="text-[10px] text-outline font-bold">Modèle: Gemini 3.1 Pro</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
