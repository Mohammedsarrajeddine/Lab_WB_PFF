import React from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit3, 
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Activity,
  Timer,
  X,
  Minus,
  Printer,
  Share2,
  ExternalLink,
  FileText,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TableCustomizer, ColumnDefinition } from './TableCustomizer';

import { Analysis, Patient, Result } from '../types';

interface AnalysesProps {
  analyses: Analysis[];
  setAnalyses: React.Dispatch<React.SetStateAction<Analysis[]>>;
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  results: Result[];
  setResults: React.Dispatch<React.SetStateAction<Result[]>>;
  onSendToWhatsApp?: (patientName: string, message: string, attachment?: string) => void;
  searchQuery: string;
}

export const Analyses: React.FC<AnalysesProps> = ({ 
  analyses, 
  setAnalyses, 
  patients, 
  setPatients, 
  results,
  setResults,
  onSendToWhatsApp,
  searchQuery
}) => {
  const [selectedAnalysis, setSelectedAnalysis] = React.useState<Analysis | null>(null);
  const [tempPaidAmount, setTempPaidAmount] = React.useState<number>(0);
  const [isModalMinimized, setIsModalMinimized] = React.useState(false);
  
  const [isUrgencyModalOpen, setIsUrgencyModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [analysisToDelete, setAnalysisToDelete] = React.useState<Analysis | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('TOUS');
  
  // New Analysis Modal State
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingAnalysisId, setEditingAnalysisId] = React.useState<string | null>(null);
  const [isAddModalMinimized, setIsAddModalMinimized] = React.useState(false);
  const [addStep, setAddStep] = React.useState<'choice' | 'form'>('choice');
  const [isNewPatient, setIsNewPatient] = React.useState(false);

  // Sorting and Pagination State
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Analysis | 'patient' | 'cin' | 'test' | 'date' | 'prix' | 'status'; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;
  
  const [newAnalysisData, setNewAnalysisData] = React.useState({
    patientName: '',
    cin: '',
    canal: 'Sur place',
    testType: [] as string[],
    status: 'EN COURS',
    paidAmount: 0,
    // New patient fields
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    address: '',
    email: '',
    insurance: 'CNSS'
  });

  const testPrices: Record<string, number> = {
    'Bilan Lipidique': 450,
    'Glycémie à jeun': 150,
    'Hémogramme (NFS)': 200,
    'Vitesse de Sédimentation': 100,
    'Urée Sanguine': 180,
    'CRP': 120,
    'HbA1c': 250,
    'Bilan Rénal': 500,
    'Bilan Hépatique': 600
  };

  const analysisColumns: ColumnDefinition[] = [
    { id: 'ref', label: 'Reference' },
    { id: 'patient', label: 'Patient' },
    { id: 'cin', label: 'CIN' },
    { id: 'canal', label: 'Canal' },
    { id: 'test', label: 'Type de Test' },
    { id: 'date', label: 'Date & Heure' },
    { id: 'prix', label: 'Prix' },
    { id: 'status', label: 'Statut' },
    { id: 'invoice', label: 'Facture' },
    { id: 'actions', label: 'Actions' },
  ];

  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(analysisColumns.map(c => c.id));

  const isVisible = (id: string) => visibleColumns.includes(id);

  const handleSaveAnalysis = () => {
    const tests = newAnalysisData.testType;
    const totalPrice = tests.reduce((sum, t) => sum + (testPrices[t] || 0), 0);
    const paid = Number(newAnalysisData.paidAmount) || 0;

    if (editingAnalysisId) {
      setAnalyses(analyses.map(a => {
        if (a.id === editingAnalysisId) {
          const updatedAnalysis = {
            ...a,
            patient: isNewPatient ? `${newAnalysisData.lastName} ${newAnalysisData.firstName}` : newAnalysisData.patientName,
            cin: newAnalysisData.cin,
            test: tests.join(', '),
            status: newAnalysisData.status,
            canal: newAnalysisData.canal,
            prix: `${totalPrice} DH`,
            paidAmount: paid,
            totalAmount: totalPrice,
            priority: newAnalysisData.status === 'URGENT',
          };

          // Sync with Results if status is PRETE or TRAITÉ
          if (['PRETE', 'TRAITÉ'].includes(newAnalysisData.status)) {
            const existingResult = results.find(r => r.id === a.id);
            const newResult: Result = {
              id: a.id,
              patient: updatedAnalysis.patient,
              cin: updatedAnalysis.cin,
              test: updatedAnalysis.test,
              date: updatedAnalysis.date,
              status: newAnalysisData.status === 'TRAITÉ' ? 'VALIDÉ' : 'EN ATTENTE',
              paymentMode: 'Cash', // Default
              paidAmount: paid,
              totalAmount: totalPrice,
              receiptStatus: 'generate'
            };

            if (existingResult) {
              setResults(results.map(r => r.id === a.id ? newResult : r));
            } else {
              setResults([newResult, ...results]);
            }
          }

          return updatedAnalysis;
        }
        return a;
      }));
      setEditingAnalysisId(null);
    } else {
      const ref = `#ANA-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear().toString().slice(-2)} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const newAnalysis: Analysis = {
        id: ref,
        patient: isNewPatient ? `${newAnalysisData.lastName} ${newAnalysisData.firstName}` : newAnalysisData.patientName,
        cin: newAnalysisData.cin,
        test: tests.join(', '),
        date: dateStr,
        status: newAnalysisData.status,
        canal: newAnalysisData.canal,
        prix: `${totalPrice} DH`,
        paidAmount: paid,
        totalAmount: totalPrice,
        invoiceStatus: 'generate',
        priority: newAnalysisData.status === 'URGENT',
        deadline: newAnalysisData.status === 'URGENT' ? '45 min' : undefined,
        notificationTime: newAnalysisData.status === 'URGENT' ? dateStr : undefined,
        importantInfo: newAnalysisData.status === 'URGENT' ? 'Analyse critique - Traitement prioritaire requis' : undefined
      };

      setAnalyses([newAnalysis, ...analyses]);

      // Sync with Results if status is PRETE or TRAITÉ
      if (['PRETE', 'TRAITÉ'].includes(newAnalysisData.status)) {
        const newResult: Result = {
          id: ref,
          patient: newAnalysis.patient,
          cin: newAnalysis.cin,
          test: newAnalysis.test,
          date: newAnalysis.date,
          status: newAnalysisData.status === 'TRAITÉ' ? 'VALIDÉ' : 'EN ATTENTE',
          paymentMode: 'Cash',
          paidAmount: paid,
          totalAmount: totalPrice,
          receiptStatus: 'generate'
        };
        setResults([newResult, ...results]);
      }

      if (isNewPatient) {
        const clientId = `#AL-${Math.floor(100000 + Math.random() * 900000)}`;
        const newPatientObj: Patient = {
          id: clientId,
          name: `${newAnalysisData.lastName.toUpperCase()} ${newAnalysisData.firstName}`,
          initial: `${newAnalysisData.firstName[0]}${newAnalysisData.lastName[0]}`.toUpperCase(),
          cin: newAnalysisData.cin,
          dob: newAnalysisData.dob,
          phone: newAnalysisData.phone,
          address: newAnalysisData.address,
          email: newAnalysisData.email,
          insurance: newAnalysisData.insurance,
          visit: 'Nouveau',
          date: dateStr,
          history: [{
            reference: ref,
            date: dateStr,
            types: tests,
            status: newAnalysisData.status === 'URGENT' ? 'Urgent' : 
                    newAnalysisData.status === 'TRAITÉ' ? 'Validé' : 
                    newAnalysisData.status === 'PRETE' ? 'Validé' : 'En cours'
          }]
        };
        setPatients([newPatientObj, ...patients]);
      } else {
        // Update existing patient history
        setPatients(patients.map(p => {
          if (p.cin === newAnalysisData.cin || p.name === newAnalysisData.patientName) {
            return {
              ...p,
              history: [{
                reference: ref,
                date: dateStr,
                types: tests,
                status: newAnalysisData.status === 'URGENT' ? 'Urgent' : 
                        newAnalysisData.status === 'TRAITÉ' ? 'Validé' : 
                        newAnalysisData.status === 'PRETE' ? 'Validé' : 'En cours'
              }, ...p.history]
            };
          }
          return p;
        }));
      }
    }

    setIsAddModalOpen(false);
    setAddStep('choice');
    setNewAnalysisData({
      patientName: '',
      cin: '',
      canal: 'Sur place',
      testType: [],
      status: 'EN COURS',
      paidAmount: 0,
      firstName: '',
      lastName: '',
      dob: '',
      phone: '',
      address: '',
      email: '',
      insurance: 'CNSS'
    });
  };

  const groupedAnalyses = React.useMemo(() => {
    const groups: Record<string, Analysis> = {};
    analyses.forEach(a => {
      if (!groups[a.id]) {
        groups[a.id] = { 
          ...a,
          totalTests: a.totalTests || a.test.split(', ').length,
          completedTests: a.completedTests !== undefined ? a.completedTests : (['TRAITÉ', 'PRETE'].includes(a.status) ? a.test.split(', ').length : 0)
        };
      } else {
        const existing = groups[a.id];
        // Merge tests
        const existingTests = existing.test.split(', ').map(t => t.trim());
        const newTests = a.test.split(', ').map(t => t.trim());
        const allTests = Array.from(new Set([...existingTests, ...newTests]));
        existing.test = allTests.join(', ');
        
        // Update counts
        existing.totalTests = (existing.totalTests || 0) + (a.totalTests || a.test.split(', ').length);
        existing.completedTests = (existing.completedTests || 0) + (a.completedTests !== undefined ? a.completedTests : (['TRAITÉ', 'PRETE'].includes(a.status) ? a.test.split(', ').length : 0));
        
        // Update price
        const existingPrice = parseInt(existing.prix) || 0;
        const newPrice = parseInt(a.prix) || 0;
        existing.prix = `${existingPrice + newPrice} DH`;
        existing.totalAmount = (existing.totalAmount || 0) + (a.totalAmount || 0);
        existing.paidAmount = (existing.paidAmount || 0) + (a.paidAmount || 0);

        // Update overall status
        const statusPriority: Record<string, number> = {
          'URGENT': 3,
          'EN COURS': 2,
          'TRAITÉ': 1,
          'PRETE': 1
        };
        if (statusPriority[a.status] > statusPriority[existing.status]) {
          existing.status = a.status;
        }
      }
    });
    return Object.values(groups);
  }, [analyses]);

  const handleSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAnalyses = React.useMemo(() => {
    const filtered = groupedAnalyses.filter(a => {
      const matchesSearch = 
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.cin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.test.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'TOUS' || a.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Analysis];
      const bValue = b[sortConfig.key as keyof Analysis];

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue > bValue ? 1 : -1)
        : (aValue < bValue ? 1 : -1);
    });
  }, [analyses, searchQuery, statusFilter, sortConfig]);

  const totalPages = Math.ceil(sortedAnalyses.length / itemsPerPage);
  const paginatedAnalyses = sortedAnalyses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="ml-1 text-primary" /> 
      : <ArrowDown size={12} className="ml-1 text-primary" />;
  };

  const handleDeleteAnalysis = (analysis: Analysis) => {
    setAnalysisToDelete(analysis);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAnalysis = () => {
    if (analysisToDelete) {
      setAnalyses(analyses.filter(a => a.id !== analysisToDelete.id));
      setIsDeleteModalOpen(false);
      setAnalysisToDelete(null);
    }
  };

  const handleEditAnalysis = (analysis: Analysis) => {
    setEditingAnalysisId(analysis.id);
    setIsNewPatient(false);
    setAddStep('form');
    setNewAnalysisData({
      patientName: analysis.patient,
      cin: analysis.cin,
      canal: analysis.canal,
      testType: analysis.test.split(', ').map(t => t.trim()),
      status: analysis.status,
      paidAmount: analysis.paidAmount || 0,
      firstName: '',
      lastName: '',
      dob: '',
      phone: '',
      address: '',
      email: '',
      insurance: 'CNSS'
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Analyses</h2>
          <p className="text-on-surface-variant mt-1 font-body">Suivi en temps réel des prélèvements et tests</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 btn-primary-gradient text-white font-bold rounded-xl flex items-center gap-2"
        >
          <Plus size={20} />
          AJOUTER UNE ANALYSE
        </button>
      </section>

      <div className={cn(
        "bg-error-container/30 border border-error/10 p-4 rounded-2xl flex items-center gap-4 mb-8 transition-all",
        groupedAnalyses.filter(a => a.status === 'URGENT').length === 0 && "opacity-50 grayscale"
      )}>
        <div className="w-10 h-10 bg-error rounded-xl flex items-center justify-center text-white shrink-0">
          <AlertCircle size={24} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-error">{groupedAnalyses.filter(a => a.status === 'URGENT').length} Analyses Urgentes en attente</p>
          <p className="text-xs text-error/80 font-medium">Le délai moyen de traitement est actuellement de 45 minutes.</p>
        </div>
        <button 
          onClick={() => setIsUrgencyModalOpen(true)}
          className="px-4 py-2 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 transition-colors"
        >
          VOIR LES URGENCES
        </button>
      </div>

      <section className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
            <span className="text-[10px] font-black text-outline uppercase tracking-widest whitespace-nowrap">Filtrer par:</span>
            <div className="flex items-center gap-3">
              {['TOUS', 'URGENT', 'TRAITÉ', 'EN COURS', 'PRETE'].map(status => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                    statusFilter === status 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="pl-6 py-4 w-10">
                  <TableCustomizer 
                    viewId="analyses"
                    availableColumns={analysisColumns}
                    visibleColumns={visibleColumns}
                    onColumnsChange={setVisibleColumns}
                  />
                </th>
                {isVisible('ref') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center">
                      Reference {getSortIcon('id')}
                    </div>
                  </th>
                )}
                {isVisible('patient') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('patient')}
                  >
                    <div className="flex items-center">
                      Patient {getSortIcon('patient')}
                    </div>
                  </th>
                )}
                {isVisible('cin') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('cin')}
                  >
                    <div className="flex items-center">
                      CIN {getSortIcon('cin')}
                    </div>
                  </th>
                )}
                {isVisible('canal') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('canal')}
                  >
                    <div className="flex items-center">
                      Canal {getSortIcon('canal')}
                    </div>
                  </th>
                )}
                {isVisible('test') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('test')}
                  >
                    <div className="flex items-center">
                      Type de Test {getSortIcon('test')}
                    </div>
                  </th>
                )}
                {isVisible('date') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date & Heure {getSortIcon('date')}
                    </div>
                  </th>
                )}
                {isVisible('prix') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('prix')}
                  >
                    <div className="flex items-center">
                      Prix {getSortIcon('prix')}
                    </div>
                  </th>
                )}
                {isVisible('status') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Statut {getSortIcon('status')}
                    </div>
                  </th>
                )}
                {isVisible('invoice') && <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label">Facture</th>}
                {isVisible('actions') && <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {paginatedAnalyses.map((a, i) => (
                <tr key={i} className="hover:bg-primary/[0.02] transition-colors group">
                  <td className="pl-6 py-5"></td>
                  {isVisible('ref') && (
                    <td className="px-6 py-5">
                      <span className="font-headline font-bold text-sm text-primary">{a.id}</span>
                    </td>
                  )}
                  {isVisible('patient') && (
                    <td className="px-6 py-5">
                      <span className="font-semibold text-sm text-on-surface">{a.patient}</span>
                    </td>
                  )}
                  {isVisible('cin') && (
                    <td className="px-6 py-5">
                      <span className="text-sm font-medium text-on-surface-variant font-mono">{a.cin}</span>
                    </td>
                  )}
                  {isVisible('canal') && (
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        a.canal === 'Sur place' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      )}>
                        {a.canal}
                      </span>
                    </td>
                  )}
                  {isVisible('test') && (
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <FlaskConical size={16} className="text-outline" />
                        <span className="text-sm font-medium text-on-surface-variant">{a.test}</span>
                      </div>
                    </td>
                  )}
                  {isVisible('date') && <td className="px-6 py-5 text-sm text-on-surface-variant font-mono">{a.date}</td>}
                  {isVisible('prix') && (
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary">{a.prix}</span>
                        {a.paidAmount !== undefined && a.paidAmount > 0 && (
                          <span className="text-[10px] font-bold text-tertiary">Payé: {a.paidAmount} DH</span>
                        )}
                        {a.paidAmount !== undefined && a.totalAmount !== undefined && (a.totalAmount - a.paidAmount) > 0 && (
                          <span className="text-[10px] font-bold text-error">Reste: {a.totalAmount - a.paidAmount} DH</span>
                        )}
                      </div>
                    </td>
                  )}
                  {isVisible('status') && (
                    <td className="px-6 py-5">
                      {a.totalTests && a.totalTests > 1 && a.completedTests !== undefined && a.completedTests < a.totalTests ? (
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-outline">
                            <span>Progression</span>
                            <span>{Math.round((a.completedTests / a.totalTests) * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(a.completedTests / a.totalTests) * 100}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                          <span className="text-[9px] font-medium text-on-surface-variant italic">
                            {a.completedTests}/{a.totalTests} tests terminés
                          </span>
                        </div>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold",
                          a.status === 'URGENT' ? "bg-error-container/20 text-error" :
                          a.status === 'EN COURS' ? "bg-primary/10 text-primary" :
                          a.status === 'TRAITÉ' ? "bg-tertiary-container/10 text-tertiary" :
                          "bg-secondary-container/20 text-secondary"
                        )}>
                          {a.status === 'URGENT' && <AlertCircle size={12} />}
                          {a.status === 'EN COURS' && <Clock size={12} />}
                          {a.status === 'TRAITÉ' && <CheckCircle2 size={12} />}
                          {['TRAITÉ', 'PRETE'].includes(a.status) ? 'PRÊT' : a.status}
                        </span>
                      )}
                    </td>
                  )}
                  {isVisible('invoice') && (
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        {a.invoiceStatus === 'generate' && (
                          <button 
                            onClick={() => {
                              setSelectedAnalysis(a);
                              setTempPaidAmount(a.paidAmount || 0);
                            }}
                            className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-container transition-colors"
                          >
                            Générer une facture
                          </button>
                        )}
                        {a.invoiceStatus === 'generated' && (
                          <button 
                            onClick={() => {
                              setSelectedAnalysis(a);
                              setTempPaidAmount(a.paidAmount || 0);
                            }}
                            className="px-3 py-1.5 bg-tertiary text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            Facture générée
                          </button>
                        )}
                        {a.invoiceStatus === 'regenerate' && (
                          <button 
                            onClick={() => {
                              setSelectedAnalysis(a);
                              setTempPaidAmount(a.paidAmount || 0);
                            }}
                            className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded-lg hover:bg-surface-container-highest transition-colors"
                          >
                            Régénérer la facture
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                  {isVisible('actions') && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedAnalysis(a)}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEditAnalysis(a)}
                          className="p-2 hover:bg-secondary-container text-secondary rounded-lg transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteAnalysis(a)}
                          className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold text-outline uppercase tracking-widest">
            Affichage de {Math.min((currentPage - 1) * itemsPerPage + 1, sortedAnalyses.length)} à {Math.min(currentPage * itemsPerPage, sortedAnalyses.length)} sur {sortedAnalyses.length} analyses
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === pageNum 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "hover:bg-surface-container-high text-on-surface-variant"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && analysisToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-md"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-on-surface mb-2 uppercase tracking-tight">Confirmer la suppression</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer l'analyse <span className="font-bold text-primary">{analysisToDelete.id}</span> pour <span className="font-bold text-on-surface">{analysisToDelete.patient}</span> ?
                  <br />
                  <span className="text-error font-bold text-xs uppercase tracking-widest mt-2 block">Cette action est irréversible.</span>
                </p>
              </div>
              <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-surface-container-highest text-on-surface text-xs font-black rounded-xl hover:bg-surface-container transition-all uppercase tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDeleteAnalysis}
                  className="flex-1 px-6 py-3 bg-error text-white text-xs font-black rounded-xl hover:bg-error/90 transition-all shadow-lg shadow-error/20 uppercase tracking-widest"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Urgency Modal */}
      <AnimatePresence>
        {isUrgencyModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-4xl max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 bg-error-container/20 border-b border-error/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-error text-white rounded-xl flex items-center justify-center shadow-lg shadow-error/20">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-error uppercase tracking-wider">Analyses Urgentes</h3>
                    <p className="text-[10px] text-error/70 font-bold uppercase tracking-widest">Priorité Critique - Action Immédiate</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsUrgencyModalOpen(false)}
                  className="p-2 hover:bg-error/10 rounded-full transition-colors text-error"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  {groupedAnalyses.filter(a => a.status === 'URGENT').length > 0 ? (
                    groupedAnalyses.filter(a => a.status === 'URGENT').map((a, idx) => (
                      <div key={idx} className="p-5 bg-error-container/5 border border-error/10 rounded-2xl hover:bg-error-container/10 transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-error/10 text-error rounded-xl flex items-center justify-center shrink-0">
                              <FlaskConical size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-xs font-black text-error uppercase tracking-widest">{a.id}</span>
                                <span className="px-2 py-0.5 bg-error text-white text-[9px] font-black rounded uppercase tracking-tighter">Urgent</span>
                              </div>
                              <h4 className="text-lg font-black text-on-surface mb-1">{a.patient}</h4>
                              <div className="flex items-center gap-4">
                                <p className="text-sm font-bold text-on-surface-variant flex items-center gap-2">
                                  <Activity size={14} className="text-error" />
                                  {a.test}
                                </p>
                                <span className="text-[10px] font-bold text-outline font-mono bg-surface-container px-2 py-0.5 rounded">CIN: {a.cin}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Délai Restant</p>
                              <div className="flex items-center gap-2 text-error">
                                <Timer size={16} />
                                <span className="text-sm font-black font-mono">{a.deadline || '45 min'}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Notification</p>
                              <div className="flex items-center gap-2 text-on-surface-variant">
                                <Clock size={16} />
                                <span className="text-sm font-bold font-mono">{a.notificationTime || a.date}</span>
                              </div>
                            </div>
                            <div className="md:col-span-1 col-span-2 space-y-1">
                              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Info Importante</p>
                              <p className="text-xs font-medium text-error italic leading-tight">
                                {a.importantInfo || 'Traitement prioritaire requis pour ce patient.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setAnalyses(analyses.map(item => 
                                  item.id === a.id ? { ...item, status: 'EN COURS', priority: false } : item
                                ));
                              }}
                              className="px-4 py-2 bg-error text-white text-[10px] font-black rounded-lg hover:bg-error/90 transition-all shadow-md shadow-error/10 uppercase tracking-widest"
                            >
                              Traiter
                            </button>
                            <button className="p-2 bg-surface-container-high text-on-surface-variant rounded-lg hover:bg-surface-container-highest transition-colors">
                              <Eye size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center text-outline mb-4">
                        <CheckCircle2 size={40} />
                      </div>
                      <h4 className="text-xl font-black text-on-surface mb-2">Aucune urgence</h4>
                      <p className="text-sm text-on-surface-variant max-w-xs">Toutes les analyses critiques ont été traitées ou sont dans les délais normaux.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
                  Total: {groupedAnalyses.filter(a => a.status === 'URGENT').length} Analyse(s) critique(s)
                </p>
                <button 
                  onClick={() => setIsUrgencyModalOpen(false)}
                  className="px-6 py-2 bg-surface-container-highest text-on-surface text-[10px] font-black rounded-lg hover:bg-surface-container transition-all uppercase tracking-widest"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {selectedAnalysis && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                height: isModalMinimized ? 'auto' : 'auto',
                width: isModalMinimized ? '320px' : '600px'
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-wider">Facture {selectedAnalysis.id}</h3>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Détails de la transaction</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsModalMinimized(!isModalMinimized)}
                    className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
                  >
                    <Minus size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedAnalysis(null);
                      setIsModalMinimized(false);
                    }}
                    className="p-2 hover:bg-error/10 rounded-full transition-colors text-error"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              {!isModalMinimized && (
                <>
                  <div className="p-8 overflow-y-auto">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h4 className="text-xl font-black text-primary mb-1">AL MANAR LAB</h4>
                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Laboratoire d'analyses médicales</p>
                        <p className="text-xs text-outline font-medium">123 Avenue de la Marche, Casablanca</p>
                        <p className="text-xs text-outline font-medium">Tél: 05 22 00 00 00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-on-surface uppercase tracking-widest mb-1">Date d'émission</p>
                        <p className="text-sm font-bold text-primary font-mono">{selectedAnalysis.date.split(' ')[0]}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-surface-container-lowest rounded-2xl border border-surface-container">
                      <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Patient</p>
                        <p className="text-sm font-bold text-on-surface">{selectedAnalysis.patient}</p>
                        <p className="text-xs text-on-surface-variant font-mono mt-1">CIN: {selectedAnalysis.cin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Analyse</p>
                        <p className="text-sm font-bold text-on-surface">{selectedAnalysis.test}</p>
                        <p className="text-xs text-on-surface-variant mt-1">Ref: {selectedAnalysis.id}</p>
                      </div>
                    </div>

                    <table className="w-full mb-8">
                      <thead>
                        <tr className="border-b border-surface-container">
                          <th className="py-3 text-left text-[10px] font-black text-outline uppercase tracking-widest">Description</th>
                          <th className="py-3 text-right text-[10px] font-black text-outline uppercase tracking-widest">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface-container/50">
                          <td className="py-4 text-sm font-bold text-on-surface">{selectedAnalysis.test}</td>
                          <td className="py-4 text-right text-sm font-bold text-primary font-mono">{selectedAnalysis.prix}</td>
                        </tr>
                        <tr className="border-b border-surface-container/50">
                          <td className="py-4 text-sm font-bold text-tertiary uppercase tracking-wider">Avance / Montant payé</td>
                          <td className="py-4 text-right">
                            <input 
                              type="number" 
                              value={tempPaidAmount}
                              onChange={(e) => setTempPaidAmount(Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-surface-container-lowest border border-surface-container rounded text-right text-sm font-bold text-tertiary font-mono focus:outline-none focus:border-tertiary"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 text-right text-sm font-black text-on-surface uppercase tracking-widest">Reste à payer</td>
                          <td className="py-4 text-right text-lg font-black text-error font-mono">
                            {(selectedAnalysis.totalAmount || parseInt(selectedAnalysis.prix)) - tempPaidAmount} DH
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 text-right text-sm font-black text-on-surface uppercase tracking-widest">Total à payer</td>
                          <td className="py-4 text-right text-lg font-black text-primary font-mono">{selectedAnalysis.prix}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="p-4 bg-tertiary-container/10 rounded-xl border border-tertiary/10">
                      <p className="text-[10px] text-tertiary font-bold text-center uppercase tracking-widest">
                        Merci de votre confiance. Cette facture est générée électroniquement.
                      </p>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setAnalyses(analyses.map(a => a.id === selectedAnalysis.id ? { ...a, paidAmount: tempPaidAmount, invoiceStatus: 'generated' } : a));
                          // Also sync with Results if needed
                          const updatedAnalysis = { ...selectedAnalysis, paidAmount: tempPaidAmount };
                          if (['PRETE', 'TRAITÉ'].includes(updatedAnalysis.status)) {
                            const existingResult = results.find(r => r.id === updatedAnalysis.id);
                            const newResult: Result = {
                              id: updatedAnalysis.id,
                              patient: updatedAnalysis.patient,
                              cin: updatedAnalysis.cin,
                              test: updatedAnalysis.test,
                              date: updatedAnalysis.date,
                              status: updatedAnalysis.status === 'TRAITÉ' ? 'VALIDÉ' : 'EN ATTENTE',
                              paymentMode: 'Cash',
                              paidAmount: tempPaidAmount,
                              totalAmount: updatedAnalysis.totalAmount || parseInt(updatedAnalysis.prix),
                              receiptStatus: 'generate'
                            };
                            if (existingResult) {
                              setResults(results.map(r => r.id === updatedAnalysis.id ? newResult : r));
                            } else {
                              setResults([newResult, ...results]);
                            }
                          }
                          setSelectedAnalysis(null);
                        }}
                        className="px-6 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-container transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Save size={16} />
                        ENREGISTRER & GÉNÉRER
                      </button>
                      <button className="px-6 py-2.5 bg-surface-container-highest text-on-surface text-xs font-black rounded-xl hover:bg-surface-container transition-all flex items-center gap-2">
                        <Printer size={16} />
                        IMPRIMER
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        const msg = `Bonjour ${selectedAnalysis.patient}, voici votre facture pour l'analyse ${selectedAnalysis.id}`;
                        const attachment = `Facture_${selectedAnalysis.id.replace('#', '')}.pdf`;
                        if (onSendToWhatsApp) {
                          onSendToWhatsApp(selectedAnalysis.patient, msg, attachment);
                          setSelectedAnalysis(null);
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }
                      }}
                      className="px-6 py-2.5 bg-[#25D366] text-white text-xs font-black rounded-xl hover:bg-[#128C7E] transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                    >
                      <Share2 size={16} />
                      ENVOYER VIA WTP
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Analysis Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                width: isAddModalMinimized ? '320px' : '650px'
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              {/* Header */}
              <div className="p-4 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    {editingAnalysisId ? <Edit3 size={18} /> : <Plus size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-wider">
                      {editingAnalysisId ? 'Modifier l\'Analyse' : 'Nouvelle Analyse'}
                    </h3>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-widest">
                      {editingAnalysisId ? `Modification de ${editingAnalysisId}` : 'Enregistrement prélèvement'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAddModalMinimized(!isAddModalMinimized)}
                    className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
                  >
                    <Minus size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setAddStep('choice');
                      setIsAddModalMinimized(false);
                    }}
                    className="p-2 hover:bg-error/10 rounded-full transition-colors text-error"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {!isAddModalMinimized && (
                <div className="p-6 overflow-y-auto">
                  {addStep === 'choice' ? (
                    <div className="py-10 flex flex-col items-center gap-8">
                      <h4 className="text-xl font-black text-on-surface text-center">Quel type de patient ?</h4>
                      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <button 
                          onClick={() => {
                            setIsNewPatient(false);
                            setAddStep('form');
                          }}
                          className="flex-1 p-6 rounded-2xl border-2 border-surface-container hover:border-primary hover:bg-primary/5 transition-all group flex flex-col items-center gap-4"
                        >
                          <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-colors">
                            <CheckCircle2 size={24} />
                          </div>
                          <span className="font-bold text-on-surface">Patient déjà existant</span>
                        </button>
                        <button 
                          onClick={() => {
                            setIsNewPatient(true);
                            setAddStep('form');
                          }}
                          className="flex-1 p-6 rounded-2xl border-2 border-surface-container hover:border-primary hover:bg-primary/5 transition-all group flex flex-col items-center gap-4"
                        >
                          <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-colors">
                            <Plus size={24} />
                          </div>
                          <span className="font-bold text-on-surface">Nouveau patient</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {isNewPatient && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Informations Patient</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Nom</label>
                              <input 
                                type="text" 
                                value={newAnalysisData.lastName}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, lastName: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="Nom de famille"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Prénom</label>
                              <input 
                                type="text" 
                                value={newAnalysisData.firstName}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, firstName: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="Prénom"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">CIN</label>
                              <input 
                                type="text" 
                                value={newAnalysisData.cin}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, cin: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="Numéro CIN"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Date de naissance</label>
                              <input 
                                type="date" 
                                value={newAnalysisData.dob}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, dob: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Téléphone</label>
                              <input 
                                type="tel" 
                                value={newAnalysisData.phone}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, phone: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="06..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Email</label>
                              <input 
                                type="email" 
                                value={newAnalysisData.email}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, email: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="email@exemple.com"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Adresse</label>
                              <input 
                                type="text" 
                                value={newAnalysisData.address}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, address: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="Adresse complète"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Assurance</label>
                              <select 
                                value={newAnalysisData.insurance}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, insurance: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                              >
                                <option value="CNSS">CNSS</option>
                                <option value="CNOPS">CNOPS</option>
                                <option value="RAMED">RAMED</option>
                                <option value="AXA">AXA</option>
                                <option value="CIMR">CIMR</option>
                                <option value="AUCUNE">AUCUNE</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isNewPatient && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Sélection Patient</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Nom du Patient</label>
                              <input 
                                type="text" 
                                list="existing-patients"
                                value={newAnalysisData.patientName}
                                onChange={(e) => {
                                  const p = patients.find(p => p.name === e.target.value);
                                  setNewAnalysisData({
                                    ...newAnalysisData, 
                                    patientName: e.target.value,
                                    cin: p ? p.cin : newAnalysisData.cin
                                  });
                                }}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="Rechercher un patient..."
                              />
                              <datalist id="existing-patients">
                                {patients.map(p => <option key={p.id} value={p.name} />)}
                              </datalist>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">CIN</label>
                              <input 
                                type="text" 
                                value={newAnalysisData.cin}
                                onChange={(e) => setNewAnalysisData({...newAnalysisData, cin: e.target.value})}
                                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                                placeholder="CIN"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Détails Analyse</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Canal</label>
                            <select 
                              value={newAnalysisData.canal}
                              onChange={(e) => setNewAnalysisData({...newAnalysisData, canal: e.target.value})}
                              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                            >
                              <option value="Sur place">Sur place</option>
                              <option value="Depuis WhatsApp">Depuis WhatsApp</option>
                              <option value="Domicile">Domicile</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Avance / Montant payé (DH)</label>
                            <input 
                              type="number" 
                              value={newAnalysisData.paidAmount}
                              onChange={(e) => setNewAnalysisData({...newAnalysisData, paidAmount: Number(e.target.value)})}
                              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                              placeholder="0"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Types de Test (Sélectionnez un ou plusieurs)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-surface-container-lowest border border-surface-container rounded-2xl max-h-48 overflow-y-auto">
                              {Object.keys(testPrices).map(test => (
                                <label key={test} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors">
                                  <input 
                                    type="checkbox"
                                    checked={newAnalysisData.testType.includes(test)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewAnalysisData({
                                          ...newAnalysisData,
                                          testType: [...newAnalysisData.testType, test]
                                        });
                                      } else {
                                        setNewAnalysisData({
                                          ...newAnalysisData,
                                          testType: newAnalysisData.testType.filter(t => t !== test)
                                        });
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary"
                                  />
                                  <span className="text-xs font-bold text-on-surface truncate">{test}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Statut Initial</label>
                            <select 
                              value={newAnalysisData.status}
                              onChange={(e) => setNewAnalysisData({...newAnalysisData, status: e.target.value})}
                              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                            >
                              <option value="EN COURS">EN COURS</option>
                              <option value="URGENT">URGENT</option>
                              <option value="TRAITÉ">TRAITÉ</option>
                              <option value="PRETE">PRETE</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Prix Estimé</label>
                            <div className="w-full px-4 py-2.5 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold text-primary flex items-center justify-between">
                              <span>
                                {newAnalysisData.testType.reduce((sum, t) => sum + (testPrices[t] || 0), 0)} DH
                              </span>
                              <span className="text-[10px] text-outline font-medium uppercase tracking-widest">Calculé</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-end gap-3">
                        <button 
                          onClick={() => {
                            setIsAddModalOpen(false);
                            setAddStep('choice');
                          }}
                          className="px-6 py-2.5 bg-surface-container-highest text-on-surface text-xs font-black rounded-xl hover:bg-surface-container transition-all"
                        >
                          ANNULER
                        </button>
                        <button 
                          onClick={handleSaveAnalysis}
                          className="px-8 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-container transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                          <Save size={16} />
                          ENREGISTRER
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
