import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit3, 
  Trash2,
  TrendingUp,
  Calendar,
  Hourglass,
  Stethoscope,
  Users,
  FileText,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Minus,
  Save,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TableCustomizer, ColumnDefinition } from './TableCustomizer';

interface AnalysisHistory {
  reference: string;
  date: string;
  types: string[];
  status: 'Validé' | 'En cours' | 'Urgent' | 'Annulé';
}

import { Patient } from '../types';

interface PatientsProps {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  searchQuery: string;
}

export const Patients: React.FC<PatientsProps> = ({ patients, setPatients, searchQuery }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isAddModalMinimized, setIsAddModalMinimized] = useState(false);
  const [insuranceFilter, setInsuranceFilter] = useState('TOUS');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const [newPatient, setNewPatient] = useState({
    lastName: '',
    firstName: '',
    cin: '',
    dob: '',
    phone: '',
    address: '',
    email: '',
    insurance: 'AUCUNE'
  });

  const patientColumns: ColumnDefinition[] = [
    { id: 'id', label: 'ID Client' },
    { id: 'date', label: 'Date' },
    { id: 'name', label: 'Nom & Prénom' },
    { id: 'cin', label: 'CIN' },
    { id: 'dob', label: 'Date Naissance' },
    { id: 'phone', label: 'Téléphone' },
    { id: 'address', label: 'Adresse' },
    { id: 'insurance', label: 'Assurance' },
    { id: 'visit', label: 'Dernière Visite' },
    { id: 'history', label: 'Historique' },
    { id: 'actions', label: 'Actions' },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(patientColumns.map(c => c.id));

  const isVisible = (id: string) => visibleColumns.includes(id);

  const stats = [
    { label: 'Total Patients', value: '12,842', trend: '+12% vs mois dernier', icon: Users, color: 'text-primary' },
    { label: 'Nouveaux', value: '48', trend: 'Aujourd\'hui', icon: UserPlus, color: 'text-tertiary' },
    { label: 'En cours', value: '156', trend: 'Analyses en labo', icon: Hourglass, color: 'text-primary' },
    { label: 'Urgences', value: '12', trend: 'Action requise', icon: Stethoscope, color: 'text-error' },
  ];

  const handleOpenHistory = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsHistoryModalOpen(true);
  };

  const handleSavePatient = () => {
    if (editingPatientId) {
      setPatients(patients.map(p => {
        if (p.id === editingPatientId) {
          return {
            ...p,
            name: `${newPatient.lastName.toUpperCase()} ${newPatient.firstName}`,
            initial: `${newPatient.firstName[0]}${newPatient.lastName[0]}`.toUpperCase(),
            cin: newPatient.cin,
            dob: newPatient.dob,
            phone: newPatient.phone,
            address: newPatient.address,
            email: newPatient.email,
            insurance: newPatient.insurance,
          };
        }
        return p;
      }));
      setEditingPatientId(null);
    } else {
      const id = `#AL-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear().toString().slice(-2)} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const patient: Patient = {
        id,
        name: `${newPatient.lastName.toUpperCase()} ${newPatient.firstName}`,
        initial: `${newPatient.firstName[0]}${newPatient.lastName[0]}`.toUpperCase(),
        cin: newPatient.cin,
        dob: newPatient.dob,
        phone: newPatient.phone,
        address: newPatient.address,
        email: newPatient.email,
        insurance: newPatient.insurance,
        visit: 'Nouveau',
        date: dateStr,
        history: []
      };

      setPatients([patient, ...patients]);
    }

    setIsAddModalOpen(false);
    setNewPatient({
      lastName: '',
      firstName: '',
      cin: '',
      dob: '',
      phone: '',
      address: '',
      email: '',
      insurance: 'AUCUNE'
    });
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (insuranceFilter !== 'TOUS') {
      matchesFilter = p.insurance === insuranceFilter;
    }
    
    return matchesSearch && matchesFilter;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue = a[key as keyof Patient];
    let bValue = b[key as keyof Patient];

    if (aValue === undefined) aValue = '';
    if (bValue === undefined) bValue = '';

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const paginatedPatients = sortedPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
    setIsDeleteModalOpen(true);
  };

  const confirmDeletePatient = () => {
    if (patientToDelete) {
      setPatients(patients.filter(p => p.id !== patientToDelete.id));
      setIsDeleteModalOpen(false);
      setPatientToDelete(null);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatientId(patient.id);
    const names = patient.name.split(' ');
    const lastName = names[0];
    const firstName = names.slice(1).join(' ');
    
    setNewPatient({
      lastName,
      firstName,
      cin: patient.cin,
      dob: patient.dob,
      phone: patient.phone,
      address: patient.address,
      email: patient.email || '',
      insurance: patient.insurance
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Patients</h2>
          <p className="text-on-surface-variant mt-1 font-body">Gérez le répertoire central des patients</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 btn-primary-gradient text-white font-bold rounded-xl flex items-center gap-2"
        >
          <UserPlus size={20} />
          AJOUTER UN PATIENT
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="tonal-card p-6 flex items-start justify-between group cursor-pointer hover:bg-surface-container-low">
            <div>
              <p className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 font-label">{stat.label}</p>
              <h3 className={cn("text-3xl font-extrabold font-headline", stat.color === 'text-error' && 'text-error')}>{stat.value}</h3>
              <div className={cn("flex items-center gap-1 mt-2 font-bold text-xs", stat.color)}>
                {stat.label === 'Total Patients' && <TrendingUp size={14} />}
                {stat.label === 'Nouveaux' && <Calendar size={14} />}
                <span>{stat.trend}</span>
              </div>
            </div>
            <div className={cn("p-3 rounded-xl transition-all group-hover:bg-primary group-hover:text-white", stat.color.replace('text-', 'bg-').replace('primary', 'primary/5').replace('tertiary', 'tertiary/5').replace('error', 'error/5'), stat.color)}>
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
              {['TOUS', 'CNOPS', 'CNSS', 'AXA', 'SAHAM', 'RMA', 'MUTUELLE', 'SANS'].map(filter => (
                <button 
                  key={filter}
                  onClick={() => setInsuranceFilter(filter)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                    insuranceFilter === filter 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  )}
                >
                  {filter}
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
                    viewId="patients"
                    availableColumns={patientColumns}
                    visibleColumns={visibleColumns}
                    onColumnsChange={setVisibleColumns}
                  />
                </th>
                {isVisible('id') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                      ID Client
                      {sortConfig?.key === 'id' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('date') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      {sortConfig?.key === 'date' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('name') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nom & Prénom
                      {sortConfig?.key === 'name' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('cin') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('cin')}
                  >
                    <div className="flex items-center gap-2">
                      CIN
                      {sortConfig?.key === 'cin' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('dob') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('dob')}
                  >
                    <div className="flex items-center gap-2">
                      Date Naissance
                      {sortConfig?.key === 'dob' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('phone') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('phone')}
                  >
                    <div className="flex items-center gap-2">
                      Téléphone
                      {sortConfig?.key === 'phone' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('address') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('address')}
                  >
                    <div className="flex items-center gap-2">
                      Adresse
                      {sortConfig?.key === 'address' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('insurance') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('insurance')}
                  >
                    <div className="flex items-center gap-2">
                      Assurance
                      {sortConfig?.key === 'insurance' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('visit') && (
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('visit')}
                  >
                    <div className="flex items-center gap-2">
                      Dernière Visite
                      {sortConfig?.key === 'visit' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : <ArrowUpDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                )}
                {isVisible('history') && <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label">Historique</th>}
                {isVisible('actions') && <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-[0.05em] font-label text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {paginatedPatients.map((p, i) => (
                <tr key={i} className="hover:bg-primary/[0.02] transition-colors group">
                  <td className="pl-6 py-5"></td>
                  {isVisible('id') && (
                    <td className="px-6 py-5">
                      <span className="font-headline font-bold text-sm text-primary">{p.id}</span>
                    </td>
                  )}
                  {isVisible('date') && <td className="px-6 py-5 text-sm font-medium text-on-surface-variant">{p.date}</td>}
                  {isVisible('name') && (
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container">{p.initial}</div>
                        <span className="font-semibold text-sm text-on-surface">{p.name}</span>
                      </div>
                    </td>
                  )}
                  {isVisible('cin') && <td className="px-6 py-5 text-sm font-medium text-on-surface-variant">{p.cin}</td>}
                  {isVisible('dob') && <td className="px-6 py-5 text-sm text-on-surface-variant">{p.dob}</td>}
                  {isVisible('phone') && <td className="px-6 py-5 text-sm text-on-surface-variant font-medium">{p.phone}</td>}
                  {isVisible('address') && <td className="px-6 py-5 text-sm text-on-surface-variant max-w-[150px] truncate">{p.address}</td>}
                  {isVisible('insurance') && (
                    <td className="px-6 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold",
                        p.insurance === 'CNOPS' ? "bg-tertiary-container/10 text-tertiary-container" :
                        p.insurance === 'CNSS' ? "bg-primary/10 text-primary" : "bg-surface-container text-outline"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", 
                          p.insurance === 'CNOPS' ? "bg-tertiary-container" :
                          p.insurance === 'CNSS' ? "bg-primary" : "bg-outline"
                        )} />
                        {p.insurance}
                      </span>
                    </td>
                  )}
                  {isVisible('visit') && (
                    <td className="px-6 py-5 text-sm">
                      {p.urgent ? (
                        <span className="text-error font-bold">URGENT <span className="text-outline font-normal ml-1">y a 2h</span></span>
                      ) : (
                        <span className="text-on-surface font-medium">{p.visit}</span>
                      )}
                    </td>
                  )}
                  {isVisible('history') && (
                    <td className="px-6 py-5">
                      <button 
                        onClick={() => handleOpenHistory(p)}
                        className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        title="Voir l'historique"
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  )}
                  {isVisible('actions') && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenHistory(p)}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEditPatient(p)}
                          className="p-2 hover:bg-secondary-container text-secondary rounded-lg transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeletePatient(p)}
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

        <div className="p-6 border-t border-surface-container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span className="text-xs font-bold text-on-surface-variant">Total: <span className="text-primary">{sortedPatients.length}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-tertiary" />
              <span className="text-xs font-bold text-on-surface-variant">Page: <span className="text-tertiary">{currentPage} / {totalPages || 1}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container-low transition-colors text-outline disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i + 1;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              if (pageNum <= 0) return null;
              if (pageNum > totalPages) return null;

              return (
                <button 
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all",
                    currentPage === pageNum ? "bg-primary text-white shadow-md shadow-primary/20" : "hover:bg-surface-container-low text-outline"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container-low transition-colors text-outline disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && patientToDelete && (
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
                  Êtes-vous sûr de vouloir supprimer le patient <span className="font-bold text-primary">{patientToDelete.name}</span> (CIN: <span className="font-bold text-on-surface">{patientToDelete.cin}</span>) ?
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
                  onClick={confirmDeletePatient}
                  className="flex-1 px-6 py-3 bg-error text-white text-xs font-black rounded-xl hover:bg-error/90 transition-all shadow-lg shadow-error/20 uppercase tracking-widest"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      {isHistoryModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-on-surface font-headline">Historique des Analyses</h3>
                  <p className="text-on-surface-variant font-medium">{selectedPatient.name} • {selectedPatient.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <X size={24} className="text-outline" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-4">
                {selectedPatient.history.length > 0 ? (
                  selectedPatient.history.map((item, idx) => (
                    <div key={idx} className="bg-surface-container-low rounded-2xl p-5 border border-surface-container group hover:border-primary/30 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            item.status === 'Validé' ? "bg-tertiary/10 text-tertiary" :
                            item.status === 'Urgent' ? "bg-error/10 text-error" :
                            item.status === 'En cours' ? "bg-primary/10 text-primary" : "bg-outline/10 text-outline"
                          )}>
                            {item.status === 'Validé' ? <CheckCircle2 size={20} /> :
                             item.status === 'Urgent' ? <AlertCircle size={20} /> :
                             item.status === 'En cours' ? <Clock size={20} /> : <X size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-on-surface">{item.reference}</span>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">{item.date}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.types.map((type, tIdx) => (
                                <span key={tIdx} className="px-2 py-0.5 bg-white rounded-md text-[10px] font-bold text-on-surface-variant border border-surface-container">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            item.status === 'Validé' ? "bg-tertiary-container/20 text-tertiary" :
                            item.status === 'Urgent' ? "bg-error-container/20 text-error" :
                            item.status === 'En cours' ? "bg-primary-container/20 text-primary" : "bg-surface-container text-outline"
                          )}>
                            {item.status}
                          </span>
                          <button className="p-2 hover:bg-white rounded-lg text-primary transition-colors">
                            <Eye size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-on-surface-variant font-medium">Aucun historique d'analyse trouvé pour ce patient.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-surface-container bg-surface-container-lowest flex justify-end">
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-8 py-3 bg-surface-container text-on-surface font-bold rounded-xl hover:bg-surface-container-high transition-colors"
              >
                FERMER
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                height: isAddModalMinimized ? 'auto' : 'auto',
                width: isAddModalMinimized ? '320px' : '600px'
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    {editingPatientId ? <Edit3 size={20} /> : <UserPlus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-on-surface uppercase tracking-wider">
                      {editingPatientId ? 'Modifier Patient' : 'Nouveau Patient'}
                    </h3>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-widest">
                      {editingPatientId ? `Modification de ${editingPatientId}` : 'Création de dossier'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAddModalMinimized(!isAddModalMinimized)}
                    className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
                  >
                    <Minus size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsAddModalMinimized(false);
                    }}
                    className="p-2 hover:bg-error/10 rounded-full transition-colors text-error"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              {!isAddModalMinimized && (
                <>
                  <div className="p-8 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Nom</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input 
                            type="text" 
                            value={newPatient.lastName}
                            onChange={(e) => setNewPatient({...newPatient, lastName: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="Ex: EL OUALI"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Prénom</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input 
                            type="text" 
                            value={newPatient.firstName}
                            onChange={(e) => setNewPatient({...newPatient, firstName: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="Ex: Yassine"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">CIN</label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input 
                            type="text" 
                            value={newPatient.cin}
                            onChange={(e) => setNewPatient({...newPatient, cin: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="Ex: AB123456"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Date de Naissance</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input 
                            type="text" 
                            value={newPatient.dob}
                            onChange={(e) => setNewPatient({...newPatient, dob: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="JJ/MM/AA"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Téléphone</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input 
                            type="tel" 
                            value={newPatient.phone}
                            onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="+212 6..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input 
                            type="email" 
                            value={newPatient.email}
                            onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="patient@email.com"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Adresse</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input 
                            type="text" 
                            value={newPatient.address}
                            onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="Adresse complète"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Assurance / Couverture Médicale</label>
                        <select 
                          value={newPatient.insurance}
                          onChange={(e) => setNewPatient({...newPatient, insurance: e.target.value})}
                          className="w-full px-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors appearance-none"
                        >
                          <option value="AUCUNE">AUCUNE</option>
                          <option value="CNOPS">CNOPS</option>
                          <option value="CNSS">CNSS</option>
                          <option value="FAR">FAR</option>
                          <option value="MUTUELLE">AUTRE MUTUELLE</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-8 bg-surface-container-low border-t border-surface-container flex justify-end gap-4">
                    <button 
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-8 py-3 bg-surface-container text-on-surface font-bold rounded-xl hover:bg-surface-container-high transition-colors"
                    >
                      ANNULER
                    </button>
                    <button 
                      onClick={handleSavePatient}
                      className="px-8 py-3 btn-primary-gradient text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      <Save size={18} />
                      ENREGISTRER
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
