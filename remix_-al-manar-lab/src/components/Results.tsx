import React from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Download, 
  Share2,
  FileText,
  CheckCircle2,
  Clock,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Send,
  Zap,
  X,
  Minus,
  Printer,
  Edit3,
  Trash2,
  Activity,
  User,
  Calendar,
  FlaskConical,
  Microscope,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TableCustomizer, ColumnDefinition } from './TableCustomizer';

import { Result } from '../types';

export const Results: React.FC<{ 
  results: Result[];
  setResults: React.Dispatch<React.SetStateAction<Result[]>>;
  onSendToWhatsApp?: (patientName: string, message: string, attachment?: string) => void;
  searchQuery: string;
}> = ({ results, setResults, onSendToWhatsApp, searchQuery }) => {
  const [selectedResult, setSelectedResult] = React.useState<Result | null>(null);
  const [viewingResultFile, setViewingResultFile] = React.useState<Result | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [resultToDelete, setResultToDelete] = React.useState<Result | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [resultToEdit, setResultToEdit] = React.useState<Result | null>(null);
  const [isModalMinimized, setIsModalMinimized] = React.useState(false);
  const [showToast, setShowToast] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [statusFilter, setStatusFilter] = React.useState('TOUS');
  const [isCompletedAnalysesModalOpen, setIsCompletedAnalysesModalOpen] = React.useState(false);

  // Sorting and Pagination State
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Result | 'patient' | 'cin' | 'test' | 'date' | 'paidAmount' | 'status'; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;

  const resultColumns: ColumnDefinition[] = [
    { id: 'ref', label: 'Reference' },
    { id: 'patient', label: 'Patient' },
    { id: 'cin', label: 'CIN' },
    { id: 'test', label: 'Resultat' },
    { id: 'date', label: 'Date' },
    { id: 'mode', label: 'Mode de paiement' },
    { id: 'paid', label: 'Montant payé' },
    { id: 'status', label: 'Statut' },
    { id: 'receipt', label: 'Reçu' },
    { id: 'actions', label: 'Actions' },
  ];

  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(resultColumns.map(c => c.id));

  const isVisible = (id: string) => visibleColumns.includes(id);

  const groupedResults = React.useMemo(() => {
    const groups: Record<string, Result> = {};
    results.forEach(r => {
      if (!groups[r.id]) {
        groups[r.id] = { 
          ...r,
          totalTests: r.totalTests || 1,
          completedTests: r.completedTests !== undefined ? r.completedTests : (r.status === 'VALIDÉ' ? 1 : 0)
        };
      } else {
        const existing = groups[r.id];
        // Merge tests if they are different
        if (!existing.test.includes(r.test)) {
          existing.test += `, ${r.test}`;
        }
        // Update counts
        existing.totalTests = (existing.totalTests || 1) + (r.totalTests || 1);
        existing.completedTests = (existing.completedTests || 0) + (r.completedTests !== undefined ? r.completedTests : (r.status === 'VALIDÉ' ? 1 : 0));
        
        // Update overall status
        if (existing.completedTests < existing.totalTests) {
          existing.status = 'EN COURS';
        } else {
          existing.status = 'VALIDÉ';
        }
      }
    });
    return Object.values(groups);
  }, [results]);

  const stats = [
    { label: 'Validés Aujourd\'hui', value: groupedResults.filter(r => r.status === 'VALIDÉ').length.toString(), trend: '+4 depuis 1h', icon: CheckCircle2, color: 'text-tertiary' },
    { label: 'Envoyés WhatsApp', value: '18', trend: '75% de diffusion', icon: Send, color: 'text-primary' },
    { label: 'Analysés par IA', value: groupedResults.filter(r => r.ai).length.toString(), trend: 'Précision 99.9%', icon: Sparkles, color: 'text-primary-container' },
    { label: 'En Attente', value: groupedResults.filter(r => r.status === 'EN ATTENTE').length.toString().padStart(2, '0'), trend: 'Action requise', icon: Clock, color: 'text-error' },
  ];

  const handleSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = React.useMemo(() => {
    const filtered = groupedResults.filter(r => {
      const matchesSearch = 
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.test.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'TOUS' || r.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Result];
      const bValue = b[sortConfig.key as keyof Result];

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
  }, [results, searchQuery, statusFilter, sortConfig]);

  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);
  const paginatedResults = sortedResults.slice(
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

  const handleDownload = (result: Result) => {
    setShowToast({ message: `Téléchargement du résultat ${result.id} lancé...`, type: 'success' });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleShare = (result: Result) => {
    const msg = `Bonjour ${result.patient}, votre résultat d'analyse ${result.id} est disponible.`;
    if (onSendToWhatsApp) {
      onSendToWhatsApp(result.patient, msg, `Resultat_${result.id.replace('#', '')}.pdf`);
      setShowToast({ message: `Résultat partagé avec ${result.patient}`, type: 'success' });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleEditResult = (result: Result) => {
    setResultToEdit({ ...result });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resultToEdit) {
      const exists = results.some(r => r.id === resultToEdit.id);
      if (exists) {
        setResults(results.map(r => r.id === resultToEdit.id ? resultToEdit : r));
      } else {
        setResults([resultToEdit, ...results]);
      }
      setIsEditModalOpen(false);
      setResultToEdit(null);
      setShowToast({ message: exists ? "Résultat mis à jour avec succès" : "Nouveau résultat ajouté avec succès", type: 'success' });
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const handleDeleteResult = (result: Result) => {
    setResultToDelete(result);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteResult = () => {
    if (resultToDelete) {
      setResults(results.filter(r => r.id !== resultToDelete.id));
      setIsDeleteModalOpen(false);
      setResultToDelete(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Résultats</h2>
          <p className="text-on-surface-variant mt-1 font-body">Validation et diffusion des comptes-rendus</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="tonal-card p-6 flex items-start justify-between group cursor-pointer hover:bg-surface-container-low">
            <div>
              <p className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 font-label">{stat.label}</p>
              <h3 className={cn("text-3xl font-extrabold font-headline", stat.color === 'text-error' && 'text-error')}>{stat.value}</h3>
              <div className={cn("flex items-center gap-1 mt-2 font-bold text-xs", stat.color)}>
                {stat.label === 'Validés Aujourd\'hui' && <TrendingUp size={14} />}
                {stat.label === 'Analysés par IA' && <Zap size={14} />}
                <span>{stat.trend}</span>
              </div>
            </div>
            <div className={cn(
              "p-3 rounded-xl transition-all group-hover:bg-primary group-hover:text-white", 
              stat.color.replace('text-', 'bg-').replace('primary-container', 'primary/5').replace('primary', 'primary/5').replace('tertiary', 'tertiary/5').replace('error', 'error/5'), 
              stat.color
            )}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </section>

      <section className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
            <span className="text-[10px] font-black text-outline uppercase tracking-widest whitespace-nowrap">Filtrer par:</span>
            <div className="flex items-center gap-3">
              {['TOUS', 'VALIDÉ', 'EN ATTENTE', 'EN COURS'].map(status => (
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
                  {status === 'VALIDÉ' ? 'PRÊT' : status}
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
                    viewId="results"
                    availableColumns={resultColumns}
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
                {isVisible('test') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('test')}
                  >
                    <div className="flex items-center">
                      Resultat {getSortIcon('test')}
                    </div>
                  </th>
                )}
                {isVisible('date') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date {getSortIcon('date')}
                    </div>
                  </th>
                )}
                {isVisible('mode') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('paymentMode')}
                  >
                    <div className="flex items-center">
                      Mode de paiement {getSortIcon('paymentMode')}
                    </div>
                  </th>
                )}
                {isVisible('paid') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:bg-surface-container-high transition-colors"
                    onClick={() => handleSort('paidAmount')}
                  >
                    <div className="flex items-center">
                      Montant payé {getSortIcon('paidAmount')}
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
                {isVisible('receipt') && <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label">Reçu</th>}
                {isVisible('actions') && <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {paginatedResults.map((r, i) => (
                <tr key={i} className="hover:bg-primary/[0.02] transition-colors group">
                  <td className="pl-6 py-5"></td>
                  {isVisible('ref') && (
                    <td className="px-6 py-5">
                      <span className="font-headline font-bold text-sm text-primary">{r.id}</span>
                    </td>
                  )}
                  {isVisible('patient') && (
                    <td className="px-6 py-5">
                      <span className="font-semibold text-sm text-on-surface">{r.patient}</span>
                    </td>
                  )}
                  {isVisible('cin') && (
                    <td className="px-6 py-5">
                      <span className="text-sm font-medium text-on-surface-variant font-mono">{r.cin}</span>
                    </td>
                  )}
                  {isVisible('test') && (
                    <td className="px-6 py-5">
                      <button 
                        onClick={() => setViewingResultFile(r)}
                        className="flex items-center gap-2 hover:text-primary transition-colors group/test"
                      >
                        <FileText size={16} className="text-outline group-hover/test:text-primary" />
                        <span className="text-sm font-bold text-on-surface-variant group-hover/test:text-primary underline decoration-dotted underline-offset-4">{r.test}</span>
                        {r.ai && (
                          <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles size={8} fill="currentColor" /> IA
                          </span>
                        )}
                      </button>
                    </td>
                  )}
                  {isVisible('date') && <td className="px-6 py-5 text-sm text-on-surface-variant font-mono">{r.date}</td>}
                  {isVisible('mode') && (
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        r.paymentMode === 'Cash' ? "bg-emerald-100 text-emerald-700" :
                        r.paymentMode === 'Carte' ? "bg-indigo-100 text-indigo-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {r.paymentMode}
                      </span>
                    </td>
                  )}
                  {isVisible('paid') && (
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary">{r.paidAmount} MAD</span>
                        {r.totalAmount - r.paidAmount > 0 && (
                          <span className="text-[10px] font-bold text-error">Reste: {r.totalAmount - r.paidAmount} MAD</span>
                        )}
                      </div>
                    </td>
                  )}
                  {isVisible('status') && (
                    <td className="px-6 py-5">
                      {r.totalTests && r.totalTests > 1 && r.completedTests !== undefined && r.completedTests < r.totalTests ? (
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-outline">
                            <span>Progression</span>
                            <span>{Math.round((r.completedTests / r.totalTests) * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(r.completedTests / r.totalTests) * 100}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                          <span className="text-[9px] font-medium text-on-surface-variant italic">
                            {r.completedTests}/{r.totalTests} tests terminés
                          </span>
                        </div>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold",
                          r.status === 'VALIDÉ' ? "bg-tertiary-container/10 text-tertiary" : "bg-primary/10 text-primary"
                        )}>
                          {r.status === 'VALIDÉ' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {r.status === 'VALIDÉ' ? 'PRÊT' : r.status}
                        </span>
                      )}
                    </td>
                  )}
                  {isVisible('receipt') && (
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        {r.receiptStatus === 'generated' && (
                          <button 
                            onClick={() => setSelectedResult(r)}
                            className="px-3 py-1.5 bg-tertiary text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            Reçu généré
                          </button>
                        )}
                        {r.receiptStatus === 'regenerate' && (
                          <button 
                            onClick={() => setSelectedResult(r)}
                            className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded-lg hover:bg-surface-container-highest transition-colors"
                          >
                            Régénérer le reçu
                          </button>
                        )}
                        {r.receiptStatus === 'generate' && (
                          <button 
                            onClick={() => setSelectedResult(r)}
                            className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-container transition-colors"
                          >
                            Générer un reçu
                          </button>
                        )}
                        {/* No more null here, handled above */}
                      </div>
                    </td>
                  )}
                  {isVisible('actions') && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewingResultFile(r)}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEditResult(r)}
                          className="p-2 hover:bg-surface-container-highest text-on-surface-variant rounded-lg transition-colors"
                          title="Éditer"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDownload(r)}
                          disabled={r.totalTests !== undefined && r.completedTests !== undefined && r.completedTests < r.totalTests}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            r.totalTests !== undefined && r.completedTests !== undefined && r.completedTests < r.totalTests
                              ? "opacity-20 cursor-not-allowed"
                              : "hover:bg-secondary-container text-secondary"
                          )}
                          title={r.totalTests !== undefined && r.completedTests !== undefined && r.completedTests < r.totalTests ? "En attente des autres tests" : "Télécharger"}
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => handleShare(r)}
                          disabled={r.totalTests !== undefined && r.completedTests !== undefined && r.completedTests < r.totalTests}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            r.totalTests !== undefined && r.completedTests !== undefined && r.completedTests < r.totalTests
                              ? "opacity-20 cursor-not-allowed"
                              : "hover:bg-tertiary-container/10 text-tertiary"
                          )}
                          title={r.totalTests !== undefined && r.completedTests !== undefined && r.completedTests < r.totalTests ? "En attente des autres tests" : "Partager"}
                        >
                          <Share2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteResult(r)}
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

        {/* Pagination Controls */}
        <div className="p-4 bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold text-outline uppercase tracking-widest">
            Affichage de {Math.min((currentPage - 1) * itemsPerPage + 1, sortedResults.length)} à {Math.min(currentPage * itemsPerPage, sortedResults.length)} sur {sortedResults.length} résultats
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

      {results.filter(r => r.status === 'VALIDÉ' || r.status === 'EN ATTENTE').length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-on-surface text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="w-8 h-8 bg-tertiary rounded-full flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-sm font-bold">Analyses Terminées & Prêtes</p>
              <p className="text-[11px] text-white/60">{results.filter(r => r.status === 'VALIDÉ' || r.status === 'EN ATTENTE').length} résultats sont prêts à être envoyés.</p>
            </div>
            <button 
              onClick={() => setIsCompletedAnalysesModalOpen(true)}
              className="ml-4 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors"
            >
              VOIR
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && resultToDelete && (
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
                  Êtes-vous sûr de vouloir supprimer le résultat <span className="font-bold text-primary">{resultToDelete.id}</span> pour <span className="font-bold text-on-surface">{resultToDelete.patient}</span> ?
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
                  onClick={confirmDeleteResult}
                  className="flex-1 px-6 py-3 bg-error text-white text-xs font-black rounded-xl hover:bg-error/90 transition-all shadow-lg shadow-error/20 uppercase tracking-widest"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {selectedResult && (
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
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-wider">Reçu {selectedResult.id}</h3>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Détails du paiement</p>
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
                      setSelectedResult(null);
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
                        <p className="text-xs font-black text-on-surface uppercase tracking-widest mb-1">Date du paiement</p>
                        <p className="text-sm font-bold text-primary font-mono">{selectedResult.date.split(' ')[0]}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-surface-container-lowest rounded-2xl border border-surface-container">
                      <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Patient</p>
                        <p className="text-sm font-bold text-on-surface">{selectedResult.patient}</p>
                        <p className="text-xs text-on-surface-variant font-mono mt-1">CIN: {selectedResult.cin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Mode de paiement</p>
                        <p className="text-sm font-bold text-on-surface">{selectedResult.paymentMode}</p>
                        <p className="text-xs text-on-surface-variant mt-1">Ref: {selectedResult.id}</p>
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
                          <td className="py-4 text-sm font-bold text-on-surface">{selectedResult.test}</td>
                          <td className="py-4 text-right text-sm font-bold text-primary font-mono">{selectedResult.totalAmount} MAD</td>
                        </tr>
                        <tr>
                          <td className="py-4 text-right text-sm font-black text-on-surface uppercase tracking-widest">Montant Payé</td>
                          <td className="py-4 text-right text-lg font-black text-primary font-mono">{selectedResult.paidAmount} MAD</td>
                        </tr>
                        {selectedResult.totalAmount - selectedResult.paidAmount > 0 && (
                          <tr>
                            <td className="py-2 text-right text-sm font-bold text-error uppercase tracking-widest">Reste à payer</td>
                            <td className="py-2 text-right text-sm font-bold text-error font-mono">{selectedResult.totalAmount - selectedResult.paidAmount} MAD</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="p-4 bg-tertiary-container/10 rounded-xl border border-tertiary/10">
                      <p className="text-[10px] text-tertiary font-bold text-center uppercase tracking-widest">
                        Merci de votre confiance. Ce reçu est généré électroniquement.
                      </p>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          handleEditResult(selectedResult);
                          setSelectedResult(null);
                        }}
                        className="px-6 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-container transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Edit3 size={16} />
                        ÉDITER
                      </button>
                      <button 
                        onClick={() => setShowToast({ message: "Impression lancée...", type: 'success' })}
                        className="px-6 py-2.5 bg-surface-container-highest text-on-surface text-xs font-black rounded-xl hover:bg-surface-container transition-all flex items-center gap-2"
                      >
                        <Printer size={16} />
                        IMPRIMER
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        const msg = `Bonjour ${selectedResult.patient}, voici votre reçu pour l'analyse ${selectedResult.id}`;
                        const attachment = `Recu_${selectedResult.id.replace('#', '')}.pdf`;
                        if (onSendToWhatsApp) {
                          onSendToWhatsApp(selectedResult.patient, msg, attachment);
                          setSelectedResult(null);
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

      {/* Result File Modal */}
      <AnimatePresence>
        {viewingResultFile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-4xl max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 bg-primary text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <FlaskConical size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Compte-rendu d'Analyse {viewingResultFile.id}</h3>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Résultats de laboratoire</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingResultFile(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-10 overflow-y-auto bg-white">
                <div className="flex justify-between items-start mb-12 border-b-2 border-primary/10 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white">
                      <Microscope size={32} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-primary leading-none">AL MANAR LAB</h4>
                      <p className="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">Laboratoire d'Analyses Médicales</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-on-surface uppercase tracking-widest mb-1">Date du prélèvement</p>
                    <p className="text-sm font-bold text-primary font-mono">{viewingResultFile.date}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 mb-12">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                      <User size={10} /> Patient
                    </span>
                    <span className="text-base font-black text-on-surface">{viewingResultFile.patient}</span>
                    <span className="text-xs font-medium text-on-surface-variant font-mono">CIN: {viewingResultFile.cin}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={10} /> Date de naissance
                    </span>
                    <span className="text-base font-black text-on-surface">12/04/1988</span>
                    <span className="text-xs font-medium text-on-surface-variant">38 ans - Homme</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                      <Activity size={10} /> Prescripteur
                    </span>
                    <span className="text-base font-black text-on-surface">Dr. BENANI Ahmed</span>
                    <span className="text-xs font-medium text-on-surface-variant italic">Cardiologue</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h5 className="text-xs font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FlaskConical size={14} /> {viewingResultFile.test}
                  </h5>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low">
                        <th className="px-4 py-3 text-left text-[10px] font-black text-outline uppercase tracking-widest border-b border-surface-container">Examen</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-outline uppercase tracking-widest border-b border-surface-container">Résultat</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-outline uppercase tracking-widest border-b border-surface-container">Unité</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black text-outline uppercase tracking-widest border-b border-surface-container">Valeurs de Référence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container/50">
                      <tr>
                        <td className="px-4 py-4 text-sm font-bold text-on-surface">Cholestérol Total</td>
                        <td className="px-4 py-4 text-center text-sm font-black text-primary font-mono">1.85</td>
                        <td className="px-4 py-4 text-center text-xs font-medium text-on-surface-variant">g/L</td>
                        <td className="px-4 py-4 text-right text-xs font-medium text-outline font-mono">1.50 - 2.00</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 text-sm font-bold text-on-surface">HDL Cholestérol</td>
                        <td className="px-4 py-4 text-center text-sm font-black text-primary font-mono">0.45</td>
                        <td className="px-4 py-4 text-center text-xs font-medium text-on-surface-variant">g/L</td>
                        <td className="px-4 py-4 text-right text-xs font-medium text-outline font-mono">{">"} 0.40</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 text-sm font-bold text-on-surface">LDL Cholestérol</td>
                        <td className="px-4 py-4 text-center text-sm font-black text-error font-mono">1.40</td>
                        <td className="px-4 py-4 text-center text-xs font-medium text-on-surface-variant">g/L</td>
                        <td className="px-4 py-4 text-right text-xs font-medium text-outline font-mono">{"<"} 1.30</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 text-sm font-bold text-on-surface">Triglycérides</td>
                        <td className="px-4 py-4 text-center text-sm font-black text-primary font-mono">1.10</td>
                        <td className="px-4 py-4 text-center text-xs font-medium text-on-surface-variant">g/L</td>
                        <td className="px-4 py-4 text-right text-xs font-medium text-outline font-mono">{"<"} 1.50</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {viewingResultFile.ai && (
                  <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={18} className="text-primary" />
                      <h6 className="text-xs font-black text-primary uppercase tracking-widest">Interprétation IA (Beta)</h6>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                      L'analyse automatisée suggère un profil lipidique globalement satisfaisant, bien que le taux de LDL soit légèrement au-dessus de la valeur cible optimale. Une surveillance diététique est recommandée. <span className="font-bold text-primary italic">Note: Cette interprétation doit être validée par votre médecin traitant.</span>
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-end mt-12 pt-8 border-t border-surface-container">
                  <div className="text-[10px] text-outline font-medium">
                    <p>AL MANAR LAB - Agrément n° 456/2020</p>
                    <p>Document signé électroniquement le {viewingResultFile.date}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-12 bg-surface-container rounded border border-surface-container flex items-center justify-center mb-1">
                      <span className="text-[8px] font-black text-outline uppercase tracking-widest">Cachet & Signature</span>
                    </div>
                    <p className="text-[10px] font-bold text-on-surface">Dr. S. MANSOURI</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
                <button 
                  onClick={() => handleDownload(viewingResultFile)}
                  className="px-8 py-3 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-container transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Download size={18} />
                  TÉLÉCHARGER PDF
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleShare(viewingResultFile)}
                    className="px-6 py-3 bg-[#25D366] text-white text-xs font-black rounded-xl hover:bg-[#128C7E] transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                  >
                    <Share2 size={18} />
                    PARTAGER
                  </button>
                  <button 
                    onClick={() => setViewingResultFile(null)}
                    className="px-6 py-3 bg-surface-container-highest text-on-surface text-xs font-black rounded-xl hover:bg-surface-container transition-all"
                  >
                    FERMER
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Result Modal */}
      <AnimatePresence>
        {isEditModalOpen && resultToEdit && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-lg"
            >
              <div className="p-6 bg-primary text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Edit3 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider">Éditer le Résultat</h3>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">{resultToEdit.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Patient</label>
                    <input 
                      type="text"
                      value={resultToEdit.patient}
                      onChange={(e) => setResultToEdit({ ...resultToEdit, patient: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">CIN</label>
                    <input 
                      type="text"
                      value={resultToEdit.cin}
                      onChange={(e) => setResultToEdit({ ...resultToEdit, cin: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Analyse / Résultat</label>
                  <input 
                    type="text"
                    value={resultToEdit.test}
                    onChange={(e) => setResultToEdit({ ...resultToEdit, test: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Mode de paiement</label>
                    <select 
                      value={resultToEdit.paymentMode}
                      onChange={(e) => setResultToEdit({ ...resultToEdit, paymentMode: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Carte">Carte</option>
                      <option value="Virement">Virement</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Statut</label>
                    <select 
                      value={resultToEdit.status}
                      onChange={(e) => setResultToEdit({ ...resultToEdit, status: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="VALIDÉ">VALIDÉ</option>
                      <option value="EN ATTENTE">EN ATTENTE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Montant Payé (MAD)</label>
                    <input 
                      type="number"
                      value={resultToEdit.paidAmount}
                      onChange={(e) => setResultToEdit({ ...resultToEdit, paidAmount: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Montant Total (MAD)</label>
                    <input 
                      type="number"
                      value={resultToEdit.totalAmount}
                      onChange={(e) => setResultToEdit({ ...resultToEdit, totalAmount: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-surface-container-low border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      required
                    />
                  </div>
                </div>
              </form>

              <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-surface-container-highest text-on-surface text-xs font-black rounded-xl hover:bg-surface-container transition-all uppercase tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex-1 px-6 py-3 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-container transition-all shadow-lg shadow-primary/20 uppercase tracking-widest"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-24 right-8 z-[300] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3",
              showToast.type === 'success' ? "bg-tertiary text-white" : "bg-error text-white"
            )}
          >
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold">{showToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isCompletedAnalysesModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-2xl max-h-[80vh]"
            >
              <div className="p-6 bg-tertiary text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider">Analyses Terminées & Prêtes</h3>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Prêts pour envoi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCompletedAnalysesModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="space-y-4">
                  {results.filter(r => r.status === 'VALIDÉ' || r.status === 'EN ATTENTE').map((r, idx) => (
                    <div key={idx} className="p-4 bg-surface-container-low border border-surface-container rounded-2xl flex items-center justify-between group hover:bg-surface-container transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-tertiary/10 text-tertiary rounded-lg flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-primary uppercase tracking-widest">{r.id}</span>
                            <span className="text-[10px] font-bold text-outline font-mono">{r.date}</span>
                          </div>
                          <h4 className="text-sm font-bold text-on-surface">{r.patient}</h4>
                          <p className="text-xs text-on-surface-variant">{r.test}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setViewingResultFile(r);
                            setIsCompletedAnalysesModalOpen(false);
                          }}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleShare(r)}
                          className="px-4 py-2 bg-tertiary text-white text-[10px] font-black rounded-lg hover:bg-tertiary/90 transition-all uppercase tracking-widest"
                        >
                          Envoyer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-end">
                <button 
                  onClick={() => setIsCompletedAnalysesModalOpen(false)}
                  className="px-6 py-2 bg-surface-container-highest text-on-surface text-[10px] font-black rounded-lg hover:bg-surface-container transition-all uppercase tracking-widest"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
