export interface AnalysisHistory {
  reference: string;
  date: string;
  types: string[];
  status: 'Validé' | 'En cours' | 'Urgent' | 'Annulé';
}

export interface Patient {
  id: string;
  name: string;
  initial: string;
  cin: string;
  dob: string;
  phone: string;
  address: string;
  email?: string;
  insurance: string;
  visit: string;
  date: string;
  urgent?: boolean;
  history: AnalysisHistory[];
}

export interface Analysis {
  id: string;
  patient: string;
  cin: string;
  test: string;
  date: string;
  status: string;
  priority?: boolean;
  canal: string;
  prix: string;
  paidAmount?: number;
  totalAmount?: number;
  invoiceStatus: 'generate' | 'generated' | 'regenerate';
  deadline?: string;
  notificationTime?: string;
  importantInfo?: string;
  completedTests?: number;
  totalTests?: number;
}

export interface Result {
  id: string;
  patient: string;
  cin: string;
  test: string;
  date: string;
  status: string;
  ai?: boolean;
  paymentMode: string;
  paidAmount: number;
  totalAmount: number;
  receiptStatus: 'generate' | 'generated' | 'regenerate' | 'view';
  completedTests?: number;
  totalTests?: number;
}
