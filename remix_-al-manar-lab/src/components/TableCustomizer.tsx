import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X, RotateCcw, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface ColumnDefinition {
  id: string;
  label: string;
}

interface TableCustomizerProps {
  viewId: string;
  availableColumns: ColumnDefinition[];
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  className?: string;
}

export const TableCustomizer: React.FC<TableCustomizerProps> = ({ 
  viewId, 
  availableColumns, 
  visibleColumns, 
  onColumnsChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>(visibleColumns);
  const [isSaved, setIsSaved] = useState(false);

  // Current user prefix for persistence
  const USER_PREFIX = "SarahMansouri_";
  const STORAGE_KEY = `${USER_PREFIX}table_view_${viewId}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        onColumnsChange(parsed);
        setTempVisibleColumns(parsed);
      } catch (e) {
        console.error("Failed to parse saved view", e);
      }
    }
  }, [viewId]);

  const handleToggle = (columnId: string) => {
    setTempVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId) 
        : [...prev, columnId]
    );
  };

  const handleRestore = () => {
    const defaultColumns = availableColumns.map(c => c.id);
    setTempVisibleColumns(defaultColumns);
    onColumnsChange(defaultColumns);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempVisibleColumns));
    onColumnsChange(tempVisibleColumns);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-lg transition-all duration-200 flex items-center justify-center",
          isOpen 
            ? "bg-primary text-white shadow-lg shadow-primary/20" 
            : "text-outline hover:text-primary hover:bg-primary/5"
        )}
        title="Personnaliser les colonnes"
      >
        <SlidersHorizontal size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[60]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 mt-2 w-72 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-surface-container p-6 z-[70] overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-on-surface uppercase tracking-wider">Colonnes</h4>
                <button onClick={() => setIsOpen(false)} className="text-outline hover:text-on-surface transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar mb-6">
                {availableColumns.map((col) => (
                  <label 
                    key={col.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors group"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                      tempVisibleColumns.includes(col.id) 
                        ? "bg-primary border-primary text-white" 
                        : "border-outline group-hover:border-primary"
                    )}>
                      {tempVisibleColumns.includes(col.id) && <Check size={14} strokeWidth={3} />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={tempVisibleColumns.includes(col.id)}
                      onChange={() => handleToggle(col.id)}
                    />
                    <span className={cn(
                      "text-xs font-bold transition-colors",
                      tempVisibleColumns.includes(col.id) ? "text-on-surface" : "text-outline"
                    )}>
                      {col.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleSave}
                  className="w-full py-3 bg-primary text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-container transition-all"
                >
                  {isSaved ? <Check size={16} /> : <Save size={16} />}
                  {isSaved ? "ENREGISTRÉ" : "ENREGISTRER LA VUE"}
                </button>
                <button 
                  onClick={handleRestore}
                  className="w-full py-3 bg-surface-container-low text-on-surface-variant text-xs font-black rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-high transition-all"
                >
                  <RotateCcw size={16} />
                  RESTAURER LA VUE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
