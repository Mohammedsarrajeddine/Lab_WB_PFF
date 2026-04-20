import React, { useState, useEffect } from 'react';
import { cn } from './lib/utils';
import { Splash } from './components/Splash';
import { Login } from './components/Login';
import { Sidebar, TopAppBar } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Patients } from './components/Patients';
import { Analyses } from './components/Analyses';
import { Results } from './components/Results';
import { WhatsApp } from './components/WhatsApp';
import { Settings } from './components/Settings';
import { Account } from './components/Account';
import { Chatbot } from './components/Chatbot';
import { AIAlertNotification } from './components/AIAlertNotification';
import { Patient, Analysis, Result } from './types';

export default function App() {
  const [view, setView] = useState<'splash' | 'login' | 'app'>('splash');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [whatsappState, setWhatsappState] = useState<{ patientName?: string; message?: string; attachment?: string } | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const [patients, setPatients] = useState<Patient[]>([
    { 
      id: '#AL-99231', 
      name: 'EL OUALI Yassine', 
      initial: 'YE', 
      cin: 'BE892102', 
      dob: '12/04/88 00:00', 
      phone: '+212 661-223344', 
      address: 'Hay Riad, Rabat',
      insurance: 'CNOPS', 
      visit: '27/03/26 09:15',
      date: '12/03/26 09:00',
      history: [
        { reference: 'ANA-2024-001', date: '12/03/26 09:00', types: ['Glycémie', 'Cholestérol'], status: 'Validé' },
        { reference: 'ANA-2024-045', date: '15/02/26 11:30', types: ['Hémogramme'], status: 'Validé' }
      ]
    },
    { 
      id: '#AL-99232', 
      name: 'MANSOURI Amine', 
      initial: 'MA', 
      cin: 'CD112233', 
      dob: '25/09/95 00:00', 
      phone: '+212 610-445566', 
      address: 'Maarif, Casablanca',
      insurance: 'CNSS', 
      visit: '10/10/25 14:30',
      date: '10/10/25 14:00',
      history: [
        { reference: 'ANA-2024-089', date: '10/10/25 14:00', types: ['Bilan Lipidique'], status: 'Validé' }
      ]
    },
    { 
      id: '#AL-99233', 
      name: 'BENANI Salma', 
      initial: 'SB', 
      cin: 'EF445566', 
      dob: '30/01/82 00:00', 
      phone: '+212 665-667788', 
      address: 'Ville Nouvelle, Fès',
      insurance: 'AXA', 
      visit: '28/03/26 11:45',
      date: '28/03/26 11:00',
      history: []
    },
    ...Array.from({ length: 22 }).map((_, i) => ({
      id: `#AL-992${34 + i}`,
      name: `PATIENT ${i + 1} Test`,
      initial: 'PT',
      cin: `XY${100000 + i}`,
      dob: '01/01/90 00:00',
      phone: `+212 600-0000${i.toString().padStart(2, '0')}`,
      address: 'Marrakech',
      insurance: i % 2 === 0 ? 'CNSS' : 'CNOPS',
      visit: '29/03/26 10:00',
      date: '29/03/26 10:00',
      history: []
    }))
  ]);

  const [analyses, setAnalyses] = useState<Analysis[]>([
    { 
      id: '#ANA-4421', 
      patient: 'Asmae Bermi', 
      cin: 'AB123456', 
      test: 'Bilan Lipidique', 
      date: '28/03/26 09:15', 
      status: 'URGENT', 
      priority: true, 
      canal: 'Sur place', 
      prix: '450 DH', 
      paidAmount: 450,
      totalAmount: 450,
      invoiceStatus: 'generate',
      deadline: '15 min',
      notificationTime: '28/03/26 09:15',
      importantInfo: 'Patient diabétique - Glycémie critique suspectée'
    },
    { 
      id: '#ANA-4421', 
      patient: 'Asmae Bermi', 
      cin: 'AB123456', 
      test: 'Glycémie', 
      date: '28/03/26 09:20', 
      status: 'EN COURS', 
      canal: 'Sur place', 
      prix: '150 DH', 
      paidAmount: 0,
      totalAmount: 150,
      invoiceStatus: 'generate'
    },
    { id: '#ANA-4422', patient: 'Karim Mansouri', cin: 'CD789012', test: 'Glycémie à jeun', date: '28/03/26 10:30', status: 'EN COURS', canal: 'Depuis WhatsApp', prix: '150 DH', paidAmount: 100, totalAmount: 150, invoiceStatus: 'generated' },
    { id: '#ANA-4423', patient: 'Dr. Amine Tazi', cin: 'EF345678', test: 'Hémogramme (NFS)', date: '27/03/26 14:30', status: 'TRAITÉ', canal: 'Sur place', prix: '200 DH', paidAmount: 200, totalAmount: 200, invoiceStatus: 'regenerate' },
    { id: '#ANA-4424', patient: 'Fatima Zahraoui', cin: 'GH901234', test: 'Vitesse de Sédimentation', date: '27/03/26 16:00', status: 'PRETE', canal: 'Depuis WhatsApp', prix: '100 DH', paidAmount: 50, totalAmount: 100, invoiceStatus: 'generate' },
    { id: '#ANA-4425', patient: 'Salma Benani', cin: 'JK112233', test: 'Urée Sanguine', date: '28/03/26 11:45', status: 'TRAITÉ', canal: 'Sur place', prix: '180 DH', paidAmount: 180, totalAmount: 180, invoiceStatus: 'generated' },
    ...Array.from({ length: 20 }).map((_, i) => ({
      id: `#ANA-44${26 + i}`,
      patient: `Patient ${i + 1} Test`,
      cin: `XY${100000 + i}`,
      test: 'Hémogramme (NFS)',
      date: '29/03/26 11:00',
      status: i % 3 === 0 ? 'URGENT' : i % 3 === 1 ? 'EN COURS' : 'TRAITÉ',
      canal: 'Sur place',
      prix: '200 DH',
      paidAmount: 200,
      totalAmount: 200,
      invoiceStatus: 'generated' as const
    }))
  ]);

  const [results, setResults] = useState<Result[]>([
    { 
      id: '#ANA-4421', 
      patient: 'Asmae Bermi', 
      cin: 'AB123456', 
      test: 'Bilan Lipidique, Glycémie', 
      date: '28/03/26 11:45', 
      status: 'EN COURS', 
      ai: true, 
      paymentMode: 'Cash', 
      paidAmount: 450, 
      totalAmount: 450, 
      receiptStatus: 'generated',
      completedTests: 1,
      totalTests: 2
    },
    { 
      id: '#ANA-4422', 
      patient: 'Karim Mansouri', 
      cin: 'CD789012', 
      test: 'Glycémie à jeun', 
      date: '27/03/26 16:30', 
      status: 'VALIDÉ', 
      paymentMode: 'Carte', 
      paidAmount: 100, 
      totalAmount: 150, 
      receiptStatus: 'generate',
      completedTests: 1,
      totalTests: 1
    },
    { 
      id: '#ANA-4423', 
      patient: 'Dr. Amine Tazi', 
      cin: 'EF345678', 
      test: 'Hémogramme (NFS), CRP, Urée', 
      date: '27/03/26 15:00', 
      status: 'EN COURS', 
      paymentMode: 'Virement', 
      paidAmount: 200, 
      totalAmount: 200, 
      receiptStatus: 'regenerate',
      completedTests: 1,
      totalTests: 3
    },
    { 
      id: '#ANA-4424', 
      patient: 'Fatima Zahraoui', 
      cin: 'GH901234', 
      test: 'Vitesse de Sédimentation', 
      date: '27/03/26 14:00', 
      status: 'VALIDÉ', 
      ai: true, 
      paymentMode: 'Cash', 
      paidAmount: 50, 
      totalAmount: 100, 
      receiptStatus: 'generated',
      completedTests: 1,
      totalTests: 1
    },
    ...Array.from({ length: 21 }).map((_, i) => ({
      id: `#ANA-44${25 + i}`,
      patient: `Patient ${i + 1} Test`,
      cin: `XY${100000 + i}`,
      test: i % 4 === 0 ? 'Hémogramme (NFS), Glycémie' : 'Hémogramme (NFS)',
      date: '29/03/26 12:00',
      status: i % 4 === 0 ? 'EN COURS' : 'VALIDÉ' as const,
      paymentMode: 'Cash' as const,
      paidAmount: 200,
      totalAmount: 200,
      receiptStatus: 'generated' as const,
      completedTests: i % 4 === 0 ? 1 : 1,
      totalTests: i % 4 === 0 ? 2 : 1
    }))
  ]);

  const handleSendToWhatsApp = (patientName: string, message: string, attachment?: string) => {
    setWhatsappState({ patientName, message, attachment });
    setActiveTab('whatsapp');
  };

  const handleSplashComplete = () => {
    setView('login');
  };

  const handleLogin = () => {
    setView('app');
  };

  const handleLogout = () => {
    setView('login');
    setActiveTab('dashboard');
  };

  if (view === 'splash') {
    return <Splash onComplete={handleSplashComplete} />;
  }

  if (view === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onLogout={handleLogout}
      />
      <div className={cn(
        "flex-1 transition-all duration-300",
        isSidebarCollapsed ? "ml-[80px]" : "ml-[260px]"
      )}>
        <TopAppBar 
          isSidebarCollapsed={isSidebarCollapsed} 
          onLogout={handleLogout}
          searchQuery={globalSearchQuery}
          setSearchQuery={setGlobalSearchQuery}
          activeTab={activeTab}
        />
        <main className="p-8 mt-16">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'patients' && (
            <Patients 
              patients={patients} 
              setPatients={setPatients} 
              searchQuery={globalSearchQuery}
            />
          )}
          {activeTab === 'analyses' && (
            <Analyses 
              analyses={analyses} 
              setAnalyses={setAnalyses} 
              patients={patients} 
              setPatients={setPatients} 
              results={results}
              setResults={setResults}
              onSendToWhatsApp={handleSendToWhatsApp} 
              searchQuery={globalSearchQuery}
            />
          )}
          {activeTab === 'results' && (
            <Results 
              results={results}
              setResults={setResults}
              onSendToWhatsApp={handleSendToWhatsApp} 
              searchQuery={globalSearchQuery}
            />
          )}
          {activeTab === 'whatsapp' && (
            <WhatsApp 
              initialPatient={whatsappState?.patientName} 
              initialMessage={whatsappState?.message} 
              initialAttachment={whatsappState?.attachment}
              onClearState={() => setWhatsappState(null)}
            />
          )}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'account' && <Account />}
          {activeTab === 'chatbot' && <Chatbot />}
        </main>
      </div>
      <AIAlertNotification 
        onRedirect={setActiveTab} 
        onSendToWhatsApp={handleSendToWhatsApp}
      />
    </div>
  );
}
