import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/payments';
import { residentsApi } from '../api/residents';
import { transactionsApi } from '../api/transactions';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, sortFlats } from '../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import {
  Bell, CheckCircle2, ChevronUp, ChevronDown, Info,
  TrendingDown, TrendingUp, Plus, Trash2, Download,
  ArrowUpRight, ArrowDownLeft, FileSpreadsheet, Building2,
  Receipt, Wallet, Check, AlertCircle, Edit2, Undo2,
  Calendar, ChevronLeft, ChevronRight, CalendarDays,
  Search, Filter, ArrowUpDown, Camera, Printer, Copy
} from 'lucide-react';

const SortHeader = ({ label, col, activeCol, dir, onSort, align = 'left', className = '' }) => {
  const isActive = activeCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-2.5 text-${align} cursor-pointer select-none hover:bg-slate-100/80 transition-colors group ${className}`}
      title={`Click to sort by ${label}`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{label}</span>
        <span className={`text-[10px] transition-opacity ${isActive ? 'text-indigo-600 font-bold opacity-100' : 'opacity-25 group-hover:opacity-75'}`}>
          {isActive ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </div>
    </th>
  );
};

const DarkSortHeader = ({ label, col, activeCol, dir, onSort, align = 'center', className = '' }) => {
  const isActive = activeCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`border border-slate-700 px-4 py-2.5 text-${align} cursor-pointer select-none hover:bg-slate-800 transition-colors group ${className}`}
      title={`Click to sort by ${label}`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{label}</span>
        <span className={`text-[10px] transition-opacity ${isActive ? 'text-amber-300 font-bold opacity-100' : 'opacity-30 group-hover:opacity-80'}`}>
          {isActive ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </div>
    </th>
  );
};

export default function Payments() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';
  const isViewer = !isAdmin;

  // Month state (YYYY-MM) - dynamically defaults to current calendar month (e.g. 2026-11)
  const getCurrentMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };
  const [month, setMonth] = useState(getCurrentMonth);
  const [statusFilter, setStatusFilter] = useState('all');
  const [genAmount, setGenAmount] = useState(2750);

  // 3 Main Sub-Tabs: 'income' | 'expenditure' | 'summary'
  const [activeTab, setActiveTab] = useState('income');

  // Search & Sorting States for each Table View
  // 1. Income 25 Flats Table
  const [paymentSearch, setPaymentSearch] = useState('');
  const [sortCol, setSortCol] = useState('unit_number');
  const [sortDir, setSortDir] = useState('asc');

  // 2. Non-Maintenance Credits Table
  const [creditSearch, setCreditSearch] = useState('');
  const [creditSortCol, setCreditSortCol] = useState('date');
  const [creditSortDir, setCreditSortDir] = useState('desc');

  // 3. Expenditure Ledger Table
  const [expenditureSearch, setExpenditureSearch] = useState('');
  const [expenditureSortCol, setExpenditureSortCol] = useState('date');
  const [expenditureSortDir, setExpenditureSortDir] = useState('desc');

  // 4. Monthly Summary - Left Half (Income Summary)
  const [summaryIncomeSearch, setSummaryIncomeSearch] = useState('');
  const [summaryIncomeSortCol, setSummaryIncomeSortCol] = useState('unit');
  const [summaryIncomeSortDir, setSummaryIncomeSortDir] = useState('asc');

  // 5. Monthly Summary - Right Half (Expenditure Summary)
  const [summaryExpSearch, setSummaryExpSearch] = useState('');
  const [summaryExpSortCol, setSummaryExpSortCol] = useState('date');
  const [summaryExpSortDir, setSummaryExpSortDir] = useState('desc');

  const handleTableSort = (col, activeCol, activeDir, setCol, setDir) => {
    if (activeCol === col) {
      setDir(activeDir === 'asc' ? 'desc' : 'asc');
    } else {
      setCol(col);
      setDir('asc');
    }
  };

  // Month label helpers - e.g. "October, 2026"
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const getMonthDisplay = (ym) => {
    if (!ym) return '';
    const [yr, mo] = ym.split('-');
    const num = parseInt(mo, 10);
    const name = MONTH_NAMES[num - 1] || mo;
    return `${name}, ${yr}`;
  };
  const getMonthLabel = (ym) => getMonthDisplay(ym);

  // n - 1 Month calculation for postpaid maintenance indicator
  const [showNMinusOneInfo, setShowNMinusOneInfo] = useState(false);
  const [currYrStr, currMoStr] = (month || '').split('-');
  const currMoNum = parseInt(currMoStr, 10) || 1;
  const currYrNum = parseInt(currYrStr, 10) || new Date().getFullYear();
  const currMoName = MONTH_NAMES[currMoNum - 1] || '';

  const prevMoNum = currMoNum === 1 ? 12 : currMoNum - 1;
  const prevYrNum = currMoNum === 1 ? currYrNum - 1 : currYrNum;
  const prevMoName = MONTH_NAMES[prevMoNum - 1] || '';
  const prevMoShort = prevMoName ? prevMoName.slice(0, 3) : '';

  const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const nMinusOneExplanation = `it is the maintainance amount of that n-1 month that is ${getOrdinal(prevMoNum)} month ie ${prevMoShort} ${prevYrNum} when the selected month is ${currMoName} that is ${getOrdinal(currMoNum)} month`;

  const handlePrevMonth = () => {
    const [yr, mo] = month.split('-').map(Number);
    let pY = yr;
    let pM = mo - 1;
    if (pM === 0) { pM = 12; pY -= 1; }
    setMonth(`${pY}-${String(pM).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yr, mo] = month.split('-').map(Number);
    let nY = yr;
    let nM = mo + 1;
    if (nM === 13) { nM = 1; nY += 1; }
    setMonth(`${nY}-${String(nM).padStart(2, '0')}`);
  };

  // Redirect viewer away from summary if open
  useEffect(() => {
    if (isViewer && activeTab === 'summary') {
      setActiveTab('income');
    }
  }, [isViewer, activeTab]);

  // Modals state
  const [payModal, setPayModal] = useState({
    open: false,
    payment: null,
    payerResidentId: '',
    paidAmount: '',
    paidDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'UPI',
    roleFilter: 'all',
    notes: '',
    alreadyBilled: false,
    isEdit: false
  });
  const [editResidentModal, setEditResidentModal] = useState({
    open: false,
    payment: null,
    residentId: '',
    roleFilter: 'all'
  });
  const [showAllResidentsInModal, setShowAllResidentsInModal] = useState(false);
  const [editBillModal, setEditBillModal] = useState({
    open: false,
    payment: null,
    amount: ''
  });
  const [addCreditModal, setAddCreditModal] = useState({
    open: false,
    description: '',
    category: 'other',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    reference_number: ''
  });
  const [addDebitModal, setAddDebitModal] = useState({
    open: false,
    description: '',
    category: 'utility',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    reference_number: ''
  });
  const [editTxModal, setEditTxModal] = useState({
    open: false,
    id: null,
    description: '',
    category: 'other',
    amount: '',
    transaction_date: '',
    transaction_type: 'expense',
    reference_number: ''
  });

  // Queries
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments', month],
    queryFn: () => paymentsApi.getByMonth(month).then(res => res.data),
    staleTime: 60 * 1000,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => residentsApi.getAll().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  // Filter residents belonging specifically to a payment's flat/unit
  const getFlatResidents = useCallback((payment) => {
    if (!payment) return [];
    const targetUnit = (payment.unit_number || payment.unit || '').toUpperCase().trim();
    const targetBlock = (payment.block || '').toUpperCase().trim();
    const targetFlat = (payment.flat_number || '').toUpperCase().trim();

    return residents.filter(r => {
      const rUnit = (r.unit_number || '').toUpperCase().trim();
      const rBlock = (r.block || '').toUpperCase().trim();
      const rFlat = (r.flat_number || '').toUpperCase().trim();

      if (targetUnit && rUnit === targetUnit) return true;
      if (targetFlat && rFlat === targetFlat) {
        if (!targetBlock || !rBlock || targetBlock === rBlock) return true;
      }
      if (rBlock && rFlat && `${rBlock}-${rFlat}` === targetUnit) return true;
      if (targetBlock && targetFlat && `${targetBlock}-${targetFlat}` === rUnit) return true;
      return false;
    });
  }, [residents]);

  const editModalFlatResidents = useMemo(() => {
    return getFlatResidents(editResidentModal.payment);
  }, [editResidentModal.payment, getFlatResidents]);

  const payModalFlatResidents = useMemo(() => {
    return getFlatResidents(payModal.payment);
  }, [payModal.payment, getFlatResidents]);

  // Auto-sync payer resident ID in payment modal when opened or flat residents load
  useEffect(() => {
    if (payModal.open && payModalFlatResidents.length > 0) {
      const match = payModalFlatResidents.find(r => String(r.id) === String(payModal.payerResidentId));
      if (!match) {
        setPayModal(prev => ({
          ...prev,
          payerResidentId: String(payModalFlatResidents[0].id)
        }));
      }
    }
  }, [payModal.open, payModalFlatResidents]);

  // Transactions query for current selected month
  const { data: monthTransactions = [] } = useQuery({
    queryKey: ['transactions', month],
    queryFn: () => transactionsApi.getAll({ month }).then(res => res.data),
    staleTime: 30 * 1000,
  });

  // Sync mutations
  const invalidateAllFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
    queryClient.invalidateQueries({ queryKey: ['reports-monthly'] });
  };

  const createCreditMut = useMutation({
    mutationFn: (data) => transactionsApi.create({
      ...data,
      transaction_type: 'income',
      amount: parseFloat(data.amount)
    }),
    onSuccess: () => {
      toast.success('Credit income recorded successfully');
      setAddCreditModal({
        open: false,
        description: '',
        category: 'other',
        amount: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        reference_number: ''
      });
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to record credit transaction')
  });

  const createDebitMut = useMutation({
    mutationFn: (data) => transactionsApi.create({
      ...data,
      transaction_type: 'expense',
      amount: parseFloat(data.amount)
    }),
    onSuccess: () => {
      toast.success('Expenditure recorded successfully');
      setAddDebitModal({
        open: false,
        description: '',
        category: 'utility',
        amount: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        reference_number: ''
      });
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to record expenditure')
  });

  const updateTxMut = useMutation({
    mutationFn: ({ id, data }) => transactionsApi.update(id, {
      ...data,
      amount: parseFloat(data.amount)
    }),
    onSuccess: () => {
      toast.success('Transaction updated successfully');
      setEditTxModal({
        open: false,
        id: null,
        description: '',
        category: 'other',
        amount: '',
        transaction_date: '',
        transaction_type: 'expense',
        reference_number: ''
      });
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update transaction')
  });

  const deleteTxMut = useMutation({
    mutationFn: (id) => transactionsApi.delete(id),
    onSuccess: () => {
      toast.success('Transaction removed');
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete transaction')
  });

  const genMut = useMutation({
    mutationFn: () => paymentsApi.generate({ month, default_amount: Number(genAmount) || 2750 }),
    onSuccess: (res) => {
      toast.success(res.data?.message || `Generated payments for ${getMonthLabel(month)}`);
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to generate payments')
  });

  const payMut = useMutation({
    mutationFn: ({ id, data }) => paymentsApi.pay(id, data),
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      setPayModal({ open: false, payment: null, payerResidentId: '', paidDate: '', paymentMethod: 'UPI', roleFilter: 'all', notes: '', alreadyBilled: false, isEdit: false });
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to record payment')
  });

  const updateResidentMut = useMutation({
    mutationFn: ({ id, residentId }) => paymentsApi.update(id, { resident_id: residentId }),
    onSuccess: () => {
      toast.success('Resident linked successfully');
      setEditResidentModal({ open: false, payment: null, residentId: '', roleFilter: 'all' });
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update resident')
  });

  const updateBillMut = useMutation({
    mutationFn: ({ id, amount }) => paymentsApi.update(id, { due_amount: parseFloat(amount) }),
    onSuccess: () => {
      toast.success('Bill amount updated');
      setEditBillModal({ open: false, payment: null, amount: '' });
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update bill amount')
  });

  const revertMut = useMutation({
    mutationFn: (id) => paymentsApi.update(id, { status: 'pending', paid_amount: 0.0, paid_date: null }),
    onSuccess: () => {
      toast.success('Payment reverted to unpaid');
      invalidateAllFinance();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to revert payment')
  });

  const remindAllMut = useMutation({
    mutationFn: () => paymentsApi.remindAll(month),
    onSuccess: (res) => toast.success(res.data?.message || 'Reminders dispatched successfully'),
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to send reminders')
  });

  // Calculate user flat for viewer restriction
  const viewerFlats = useMemo(() => {
    if (!isViewer) return [];
    const directFlat = user?.flat_number || user?.unit_number;
    if (directFlat) return [directFlat];
    if (user?.resident_id) {
      const match = residents.find(r => String(r.id) === String(user.resident_id));
      if (match?.unit_number) return [match.unit_number];
    }
    if (user?.email) {
      const matchEmail = residents.filter(r => (r.owner_email || '').toLowerCase() === user.email.toLowerCase());
      if (matchEmail.length > 0) return matchEmail.map(r => r.unit_number);
    }
    return [];
  }, [user, isViewer, residents]);

  // Income calculations
  const totalDue = payments.reduce((acc, p) => acc + Number(p.due_amount || 0), 0);
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const paidFlats = payments.filter(p => p.status === 'paid');
  const unpaidFlats = payments.filter(p => p.status !== 'paid');
  const totalPending = unpaidFlats.reduce((acc, p) => acc + (Number(p.due_amount || 0) - Number(p.paid_amount || 0)), 0);

  // Credit / income transactions for selected month
  const creditTransactions = useMemo(() => {
    return monthTransactions.filter(t =>
      t.transaction_type === 'income' || t.transaction_type === 'credit' ||
      t.type === 'income' || t.type === 'credit'
    );
  }, [monthTransactions]);

  // Non-maintenance credits (or any credit without a linked payment_id)
  const nonMaintenanceCredits = useMemo(() => {
    return creditTransactions.filter(t => !t.payment_id);
  }, [creditTransactions]);

  const totalOtherCredits = nonMaintenanceCredits.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalMonthlyIncome = totalPaid + totalOtherCredits;

  // Expenditure transactions for selected month
  const debitTransactions = useMemo(() => {
    return monthTransactions.filter(t =>
      t.transaction_type === 'expense' || t.transaction_type === 'debit' ||
      t.type === 'expense' || t.type === 'debit'
    );
  }, [monthTransactions]);

  const totalExpenditure = debitTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const netSurplusDeficit = totalMonthlyIncome - totalExpenditure;

  // Filtered & sorted expenditure table for Expenditure sub-tab
  const sortedExpenditures = useMemo(() => {
    let list = [...debitTransactions];
    if (expenditureSearch.trim()) {
      const q = expenditureSearch.toLowerCase().trim();
      list = list.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.reference_number || '').toLowerCase().includes(q) ||
        String(e.amount || '').includes(q) ||
        (e.transaction_date || '').includes(q)
      );
    }
    list.sort((a, b) => {
      let valA = a[expenditureSortCol];
      let valB = b[expenditureSortCol];
      if (expenditureSortCol === 'amount') {
        valA = Number(valA || 0); valB = Number(valB || 0);
      } else if (expenditureSortCol === 'date' || expenditureSortCol === 'transaction_date') {
        valA = new Date(valA || a.transaction_date || a.created_at || 0).getTime();
        valB = new Date(valB || b.transaction_date || b.created_at || 0).getTime();
      } else if (expenditureSortCol === 'index') {
        valA = Number(a.id || 0); valB = Number(b.id || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }
      if (valA < valB) return expenditureSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return expenditureSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [debitTransactions, expenditureSearch, expenditureSortCol, expenditureSortDir]);

  // Filtered & sorted non-maintenance credits
  const filteredNonMaintenanceCredits = useMemo(() => {
    let list = [...nonMaintenanceCredits];
    if (creditSearch.trim()) {
      const q = creditSearch.toLowerCase().trim();
      list = list.filter(c =>
        (c.description || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.unit_number || '').toLowerCase().includes(q) ||
        (c.reference_number || '').toLowerCase().includes(q) ||
        String(c.amount || '').includes(q) ||
        (c.transaction_date || '').includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[creditSortCol];
      let vb = b[creditSortCol];
      if (creditSortCol === 'amount') {
        va = Number(va || 0); vb = Number(vb || 0);
      } else if (creditSortCol === 'date' || creditSortCol === 'transaction_date') {
        va = new Date(a.transaction_date || a.created_at || 0).getTime();
        vb = new Date(b.transaction_date || b.created_at || 0).getTime();
      } else {
        va = String(va || a.description || '').toLowerCase();
        vb = String(vb || b.description || '').toLowerCase();
      }
      if (va < vb) return creditSortDir === 'asc' ? -1 : 1;
      if (va > vb) return creditSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [nonMaintenanceCredits, creditSearch, creditSortCol, creditSortDir]);

  // Filtered maintenance payments for income tab
  const displayPayments = useMemo(() => {
    let list = [...payments];
    if (isViewer) {
      list = list.filter(p => {
        const u = p.unit_number || p.unit || '';
        const matchFlat = viewerFlats.length > 0 && viewerFlats.includes(u);
        const matchResId = user?.resident_id && String(p.resident_id) === String(user.resident_id);
        return matchFlat || matchResId;
      });
    } else {
      if (statusFilter === 'paid') list = list.filter(p => p.status === 'paid');
      else if (statusFilter === 'pending') list = list.filter(p => p.status !== 'paid');
      else if (statusFilter === 'overdue') list = list.filter(p => p.status === 'overdue');
    }

    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase().trim();
      list = list.filter(p => {
        const u = (p.unit_number || p.unit || '').toLowerCase();
        const r = (p.resident_name || '').toLowerCase();
        const s = (p.status || '').toLowerCase();
        return u.includes(q) || r.includes(q) || s.includes(q);
      });
    }

    if (sortCol) {
      list.sort((a, b) => {
        let va = a[sortCol];
        let vb = b[sortCol];
        if (sortCol === 'unit_number' || sortCol === 'unit') {
          const diff = sortFlats(a, b);
          return sortDir === 'asc' ? diff : -diff;
        }
        if (sortCol === 'due_amount' || sortCol === 'paid_amount') {
          va = Number(va || 0); vb = Number(vb || 0);
        } else if (sortCol === 'due_balance') {
          va = Number(a.due_amount || 0) - Number(a.paid_amount || 0);
          vb = Number(b.due_amount || 0) - Number(b.paid_amount || 0);
        } else if (sortCol === 'due_date' || sortCol === 'paid_date') {
          va = new Date(va || 0).getTime();
          vb = new Date(vb || 0).getTime();
        } else {
          va = String(va || '').toLowerCase();
          vb = String(vb || '').toLowerCase();
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return sortFlats(a, b);
      });
    } else {
      list.sort(sortFlats);
    }
    return list;
  }, [payments, isViewer, viewerFlats, user, statusFilter, paymentSearch, sortCol, sortDir]);

  // Combined and sorted lists for Monthly Summary Tab
  const combinedSummaryIncome = useMemo(() => {
    const list = [];
    payments.filter(p => Number(p.paid_amount || 0) > 0).forEach(p => {
      list.push({
        id: `p-${p.id}`,
        unit: p.unit_number || p.unit || 'Flat',
        subtext: p.resident_name || 'Resident',
        amount: Number(p.paid_amount || 0),
        date: p.paid_date ? String(p.paid_date).slice(0, 10) : '',
        isCredit: false
      });
    });
    nonMaintenanceCredits.forEach(c => {
      list.push({
        id: `c-${c.id}`,
        unit: c.unit_number || 'OTHER',
        subtext: c.description || 'Credit Income',
        amount: Number(c.amount || 0),
        date: c.transaction_date ? String(c.transaction_date).slice(0, 10) : '',
        isCredit: true
      });
    });
    list.sort(sortFlats);
    return list;
  }, [payments, nonMaintenanceCredits]);

  const filteredSummaryIncome = useMemo(() => {
    let list = [...combinedSummaryIncome];
    if (summaryIncomeSearch.trim()) {
      const q = summaryIncomeSearch.toLowerCase().trim();
      list = list.filter(item =>
        item.unit.toLowerCase().includes(q) ||
        item.subtext.toLowerCase().includes(q) ||
        String(item.amount).includes(q) ||
        item.date.includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[summaryIncomeSortCol];
      let vb = b[summaryIncomeSortCol];
      if (summaryIncomeSortCol === 'amount') {
        va = Number(va || 0); vb = Number(vb || 0);
      } else if (summaryIncomeSortCol === 'date') {
        va = new Date(va || 0).getTime(); vb = new Date(vb || 0).getTime();
      } else if (summaryIncomeSortCol === 'unit') {
        const diff = sortFlats(a.unit, b.unit);
        return summaryIncomeSortDir === 'asc' ? diff : -diff;
      } else {
        va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase();
      }
      if (va < vb) return summaryIncomeSortDir === 'asc' ? -1 : 1;
      if (va > vb) return summaryIncomeSortDir === 'asc' ? 1 : -1;
      return sortFlats(a.unit, b.unit);
    });
    return list;
  }, [combinedSummaryIncome, summaryIncomeSearch, summaryIncomeSortCol, summaryIncomeSortDir]);

  const filteredSummaryExpenditure = useMemo(() => {
    let list = [...debitTransactions];
    if (summaryExpSearch.trim()) {
      const q = summaryExpSearch.toLowerCase().trim();
      list = list.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        String(e.amount || '').includes(q) ||
        (e.transaction_date || '').includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[summaryExpSortCol];
      let vb = b[summaryExpSortCol];
      if (summaryExpSortCol === 'amount') {
        va = Number(va || 0); vb = Number(vb || 0);
      } else if (summaryExpSortCol === 'date') {
        va = new Date(a.transaction_date || a.created_at || 0).getTime();
        vb = new Date(b.transaction_date || b.created_at || 0).getTime();
      } else {
        va = String(a.description || '').toLowerCase();
        vb = String(b.description || '').toLowerCase();
      }
      if (va < vb) return summaryExpSortDir === 'asc' ? -1 : 1;
      if (va > vb) return summaryExpSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [debitTransactions, summaryExpSearch, summaryExpSortCol, summaryExpSortDir]);

  // Excel export for monthly summary
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Monthly Summary Overview
      const summaryOverview = [
        { Metric: 'Reporting Month', Value: getMonthLabel(month) },
        { Metric: 'Maintenance Collected', Value: totalPaid },
        { Metric: 'Other Credit Income', Value: totalOtherCredits },
        { Metric: 'Total Realized Income', Value: totalMonthlyIncome },
        { Metric: 'Total Expenditure', Value: totalExpenditure },
        { Metric: 'Net Surplus / Deficit', Value: netSurplusDeficit },
        { Metric: 'Total Billed Flats', Value: payments.length },
        { Metric: 'Paid Flats', Value: paidFlats.length },
        { Metric: 'Pending Flats', Value: unpaidFlats.length },
        { Metric: 'Pending Maintenance Due', Value: totalPending }
      ];
      const wsOverview = XLSX.utils.json_to_sheet(summaryOverview);
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Summary Overview');

      // Sheet 2: Income Breakdown (Maintenance + Non-Maintenance)
      const incomeRows = payments.map(p => ({
        'Source / Unit': p.unit_number || p.unit,
        'Resident Name': p.resident_name || 'Unassigned',
        'Income Type': 'Maintenance',
        'Amount Paid (₹)': p.paid_amount || 0,
        'Status': p.status,
        'Date Paid': p.paid_date || 'Unpaid'
      }));
      nonMaintenanceCredits.forEach(c => {
        incomeRows.push({
          'Source / Unit': c.unit_number || 'General Society',
          'Resident Name': c.resident || 'External / Society',
          'Income Type': `Credit (${c.category || 'other'})`,
          'Amount Paid (₹)': c.amount || 0,
          'Status': 'Received',
          'Date Paid': c.transaction_date || ''
        });
      });
      incomeRows.push({
        'Source / Unit': 'TOTAL INCOME',
        'Resident Name': '',
        'Income Type': '',
        'Amount Paid (₹)': totalMonthlyIncome,
        'Status': '',
        'Date Paid': ''
      });
      const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
      XLSX.utils.book_append_sheet(wb, wsIncome, 'Income Details');

      // Sheet 3: Expenditure Breakdown (matching spreadsheet format)
      const expRows = sortedExpenditures.map((e, idx) => ({
        'Sl No': idx + 1,
        'Expense Date': formatDate(e.transaction_date || e.created_at),
        'Particulars / Description': e.description || '',
        'Category': (e.category || 'other').toUpperCase(),
        'Amount (₹)': Number(e.amount || 0)
      }));
      expRows.push({
        'Sl No': '',
        'Expense Date': '',
        'Particulars / Description': 'GRAND TOTAL',
        'Category': '',
        'Amount (₹)': totalExpenditure
      });
      const wsExp = XLSX.utils.json_to_sheet(expRows);
      XLSX.utils.book_append_sheet(wb, wsExp, 'Expenditure Details');

      const fileName = `Monthly_Financial_Summary_${month}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported ${fileName} successfully!`);
    } catch (err) {
      toast.error('Failed to export Excel report');
    }
  };

  const [isCapturing, setIsCapturing] = useState(false);
  const reportRef = useRef(null);

  const handleCaptureScreenshot = async (copyToClipboardOnly = false) => {
    if (isCapturing) return;
    const targetElement = reportRef.current;
    if (!targetElement) {
      toast.error('Could not find report content to capture');
      return;
    }

    setIsCapturing(true);
    const toastId = toast.loading('Capturing full scrolling screenshot...');

    try {
      await new Promise(r => setTimeout(r, 120));

      const tabTitle = activeTab === 'income'
        ? 'Income_Ledger'
        : activeTab === 'expenditure'
          ? 'Expenditure_Ledger'
          : 'Monthly_Summary';
      const cleanMonthLabel = getMonthLabel(month).replace(/\s+/g, '_');
      const fileName = `SocietyTrack_${tabTitle}_${cleanMonthLabel}.png`;

      // Calculate true full scroll width across all child tables to prevent horizontal cropping
      const innerTables = Array.from(targetElement.querySelectorAll('table'));
      const maxTableWidth = innerTables.reduce((max, t) => Math.max(max, t.scrollWidth || 0), 0);
      const captureWidth = Math.max(targetElement.scrollWidth || 0, targetElement.offsetWidth || 0, maxTableWidth, 1200);

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: captureWidth,
        windowWidth: captureWidth + 40,
        onclone: (clonedDoc) => {
          const cloneContainer = clonedDoc.getElementById('payments-report-container');
          if (cloneContainer) {
            cloneContainer.style.height = 'auto';
            cloneContainer.style.width = `${captureWidth}px`;
            cloneContainer.style.maxWidth = 'none';
            cloneContainer.style.overflow = 'visible';
          }
          const scrollContainers = clonedDoc.querySelectorAll('.overflow-x-auto, .overflow-hidden');
          scrollContainers.forEach(el => {
            el.style.overflow = 'visible';
            el.style.width = `${captureWidth}px`;
            el.style.maxWidth = 'none';
          });
          const tables = clonedDoc.querySelectorAll('table');
          tables.forEach(t => {
            t.style.width = '100%';
            t.style.tableLayout = 'auto';
          });
          const stamp = clonedDoc.getElementById('screenshot-header-stamp');
          if (stamp) {
            stamp.style.display = 'flex';
          }
          const noCapture = clonedDoc.querySelectorAll('.no-screenshot');
          noCapture.forEach(el => {
            el.style.display = 'none';
          });
        }
      });

      if (copyToClipboardOnly) {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && navigator.clipboard.write) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              toast.success('Full scrolling screenshot copied to clipboard!', { id: toastId });
            } catch {
              const image = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = fileName;
              link.href = image;
              link.click();
              toast.success(`Saved full screenshot as ${fileName}`, { id: toastId });
            }
          } else {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = fileName;
            link.href = image;
            link.click();
            toast.success(`Saved full screenshot as ${fileName}`, { id: toastId });
          }
        }, 'image/png');
      } else {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = fileName;
        link.href = image;
        link.click();
        toast.success(`Full scrolling screenshot downloaded (${fileName})!`, { id: toastId, duration: 4000 });
      }
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      toast.error('Failed to capture scrolling screenshot. Please try again.', { id: toastId });
    } finally {
      setIsCapturing(false);
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'paid': return <Badge variant="success">Paid</Badge>;
      case 'partial': return <Badge variant="warning">Partial</Badge>;
      case 'overdue': return <Badge variant="danger">Overdue</Badge>;
      default: return <Badge variant="default">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Controls & Main Sub-Tabs ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sleek Month Toggle Capsule */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-2xl px-2 py-1.5 shadow-xs hover:border-slate-300 transition-all">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2.5">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight select-none">
                {getMonthDisplay(month)}
              </span>

              {/* Native Calendar Picker Overlay */}
              <div className="relative flex items-center ml-0.5">
                <input
                  type="month"
                  value={month}
                  onChange={e => e.target.value && setMonth(e.target.value)}
                  className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer z-10"
                  title="Choose Month"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="p-0.5 text-slate-500 hover:text-slate-800 rounded transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Independent n-1 Month Indicator Outside Month Selection */}
          <div className="relative inline-flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toast(nMinusOneExplanation, {
                  id: 'n-minus-one-info',
                  icon: 'ℹ️',
                  duration: 5000,
                  style: {
                    borderRadius: '12px',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: '500',
                    maxWidth: '380px'
                  }
                });
                setShowNMinusOneInfo(prev => !prev);
              }}
              onMouseEnter={() => setShowNMinusOneInfo(true)}
              onMouseLeave={() => setShowNMinusOneInfo(false)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold text-sm border border-slate-200 hover:border-indigo-300 cursor-pointer shadow-xs transition-all hover:scale-105 active:scale-95 select-none"
              title={nMinusOneExplanation}
              aria-label={nMinusOneExplanation}
            >
              {prevMoNum}
            </button>

            {/* Floating tooltip on hover / click - renders BELOW to prevent being blocked */}
            {showNMinusOneInfo && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-slate-700">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-700 rotate-45"></div>
                <p className="text-[11px] font-medium text-slate-200 leading-relaxed relative z-10">
                  {nMinusOneExplanation}
                </p>
              </div>
            )}
          </div>

          {/* Sub-Tabs: Hidden 'summary' for Viewers */}
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            {[
              { id: 'income', label: '💰 Income & Ledger' },
              { id: 'expenditure', label: '📉 Expenditure' },
              ...(!isViewer ? [{ id: 'summary', label: '📊 Monthly Summary' }] : []),
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab.id
                    ? 'bg-white shadow-xs text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Tab Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Full Scrolling Screenshot Button */}
          <button
            onClick={() => handleCaptureScreenshot(false)}
            disabled={isCapturing}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={`Capture full scrolling screenshot of ${activeTab === 'income' ? 'Income Ledger' : activeTab === 'expenditure' ? 'Expenditure Ledger' : 'Monthly Summary'} as high-res PNG`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span>{isCapturing ? 'Capturing Full Page...' : '📸 Full Screenshot'}</span>
          </button>

          {activeTab === 'summary' && (
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Download 3-sheet Excel report with Monthly Summary, Income Breakdown, and Expenditure Ledger"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel Report</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Report Content Container (Captured by Full Screenshot) ── */}
      <div
        ref={reportRef}
        id="payments-report-container"
        className="space-y-6"
      >
        {/* Screenshot / Print Header Stamp */}
        <div
          id="screenshot-header-stamp"
          className="hidden print:flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              ST
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">SocietyTrack Financial Statement</h2>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === 'income' ? '25 Flats Income & Maintenance Ledger' : activeTab === 'expenditure' ? 'Monthly Itemized Expenditure Ledger' : 'Monthly Financial Summary'} • Period: <span className="font-bold text-slate-800">{getMonthLabel(month)}</span>
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-medium">
            Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
           SUB-TAB 1: INCOME & MAINTENANCE LEDGER
      ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'income' && (
          <div className="space-y-6">
            {/* Admin KPI & Actions Bar */}
            {isAdmin ? (
              <>
                {/* Generation & Reminders Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3.5 rounded-xl shadow-xs border border-slate-100">
                  {/* Status Filter Tabs */}
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    {[
                      { id: 'all', label: `All Flats (${payments.length})` },
                      { id: 'paid', label: `Paid Flats (${paidFlats.length})` },
                      { id: 'pending', label: `Yet to Pay (${unpaidFlats.length})` },
                      { id: 'overdue', label: 'Overdue' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${statusFilter === tab.id ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => {
                        if (window.confirm(`Send payment reminder alerts to all ${unpaidFlats.length} unpaid flat residents for ${getMonthLabel(month)}?`)) {
                          remindAllMut.mutate();
                        }
                      }}
                      disabled={remindAllMut.isPending || unpaidFlats.length === 0}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {remindAllMut.isPending ? 'Sending...' : `Alert All Unpaid (${unpaidFlats.length})`}
                    </button>

                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-xs">
                      <span className="text-xs text-slate-500 font-semibold mr-1">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={genAmount}
                        onChange={e => setGenAmount(e.target.value)}
                        className="w-16 bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        title="Monthly Maintenance Amount"
                      />
                    </div>

                    <button
                      onClick={() => genMut.mutate()}
                      disabled={genMut.isPending}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
                    >
                      {genMut.isPending ? 'Generating...' : `Generate Monthly (₹${Number(genAmount || 0).toLocaleString()})`}
                    </button>
                  </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-l-blue-500">
                    <p className="text-xs text-slate-500 font-medium">Total Due (25 Flats)</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalDue)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-l-green-500">
                    <p className="text-xs text-slate-500 font-medium">Maintenance Collected</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-l-amber-500">
                    <p className="text-xs text-slate-500 font-medium">Pending Due</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(totalPending)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500 font-medium">Flats Status</p>
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                        {paidFlats.length}/25 Paid
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold text-emerald-600">{paidFlats.length} Paid</span>
                      <span className="text-slate-400 font-normal">·</span>
                      <span className="text-xs font-semibold text-amber-600">{unpaidFlats.length} Yet to Pay</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Viewer View Banner */
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm">Resident Flat Maintenance Record</span>
                  <p className="text-indigo-700 mt-0.5">
                    Showing dues and payment ledger for flat(s): <strong>{viewerFlats.join(', ') || 'Your Registered Flat'}</strong>
                  </p>
                </div>
                <Badge variant="default">Viewer Access</Badge>
              </div>
            )}

            {/* Maintenance Table */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isAdmin ? '25 Flats Maintenance Ledger' : 'My Flat Maintenance Status'}
                  </h3>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Period: <strong>{getMonthLabel(month)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search flat, resident, status..."
                      value={paymentSearch}
                      onChange={e => setPaymentSearch(e.target.value)}
                      className="w-full pl-8 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white shadow-2xs"
                    />
                    {paymentSearch && (
                      <button onClick={() => setPaymentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/75 text-slate-600 font-semibold">
                    <tr>
                      <SortHeader label="Unit / Flat" col="unit_number" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} className="sticky left-0 z-10 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0]" align="center" />
                      <SortHeader label="Paid / Billed Resident" col="resident_name" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      <SortHeader label="Bill Amount" col="due_amount" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      <SortHeader label="Paid Amount" col="paid_amount" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      <SortHeader label="Due Balance" col="due_balance" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      <SortHeader label="Due Date" col="due_date" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      <SortHeader label="Paid Date" col="paid_date" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      <SortHeader label="Mode" col="payment_method" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      <SortHeader label="Status" col="status" activeCol={sortCol} dir={sortDir} onSort={(c) => handleTableSort(c, sortCol, sortDir, setSortCol, setSortDir)} align="center" />
                      {isAdmin && <th className="px-4 py-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {isLoadingPayments ? (
                      <tr>
                        <td colSpan={isAdmin ? 10 : 9} className="p-6 text-center text-slate-400">
                          Loading payment ledger...
                        </td>
                      </tr>
                    ) : displayPayments.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 10 : 9} className="p-6 text-center text-slate-400">
                          No maintenance records found for {getMonthLabel(month)}.
                        </td>
                      </tr>
                    ) : (
                      displayPayments.map(p => {
                        const dueBalance = (p.due_amount || 0) - (p.paid_amount || 0);
                        const isPaid = p.status === 'paid';
                        const unitName = p.unit_number || p.unit || 'Flat';
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                            <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-4 py-3 font-bold text-slate-900 text-center shadow-[1px_0_0_0_#e2e8f0]">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                                {unitName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-semibold text-slate-800">{p.resident_name || 'Unassigned'}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      setShowAllResidentsInModal(false);
                                      setEditResidentModal({
                                        open: true,
                                        payment: p,
                                        residentId: p.resident_id || '',
                                        roleFilter: 'all'
                                      });
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold border border-indigo-200 px-1 rounded hover:bg-indigo-50 cursor-pointer"
                                    title="Change payer/resident"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5 text-center">
                                {p.resident_role ? `${p.resident_role.toUpperCase()}` : 'Resident'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 font-bold text-slate-800">
                                <span>{formatCurrency(p.due_amount || 0)}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => setEditBillModal({ open: true, payment: p, amount: p.due_amount || '' })}
                                    className="text-slate-400 hover:text-indigo-600 text-[10px] border border-slate-200 px-1 rounded hover:bg-slate-50 cursor-pointer"
                                    title="Edit bill amount"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-600 text-center">
                              {formatCurrency(p.paid_amount || 0)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-center">
                              {dueBalance <= 0 ? (
                                <span className="text-emerald-600 font-bold">₹0 (Cleared)</span>
                              ) : (
                                <span className="text-rose-600 font-bold">{formatCurrency(dueBalance)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-center">
                              {p.due_date ? formatDate(p.due_date) : '10th of month'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.paid_date ? (
                                <span className="text-emerald-700 font-medium">{formatDate(p.paid_date)}</span>
                              ) : (
                                <span className="text-slate-400 italic">Unpaid</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.payment_method ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                                  {p.payment_method}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center">
                                {getStatusBadge(p.status)}
                              </div>
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {!isPaid ? (
                                    <button
                                      onClick={() => {
                                        const flatRes = getFlatResidents(p);
                                        const defaultResId = p.resident_id ? String(p.resident_id) : (flatRes.length > 0 ? String(flatRes[0].id) : '');
                                        setPayModal({
                                          open: true,
                                          payment: p,
                                          payerResidentId: defaultResId,
                                          paidAmount: p.due_amount || '',
                                          paidDate: new Date().toISOString().slice(0, 10),
                                          paymentMethod: p.payment_method || 'UPI',
                                          roleFilter: 'all',
                                          notes: '',
                                          alreadyBilled: false,
                                          isEdit: false
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer"
                                    >
                                      Pay / Settle
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          const flatRes = getFlatResidents(p);
                                          const defaultResId = p.resident_id ? String(p.resident_id) : (flatRes.length > 0 ? String(flatRes[0].id) : '');
                                          setPayModal({
                                            open: true,
                                            payment: p,
                                            payerResidentId: defaultResId,
                                            paidAmount: p.paid_amount || p.due_amount || '',
                                            paidDate: p.paid_date ? String(p.paid_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
                                            paymentMethod: p.payment_method || 'UPI',
                                            roleFilter: 'all',
                                            notes: p.notes || '',
                                            alreadyBilled: false,
                                            isEdit: true
                                          });
                                        }}
                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold border border-indigo-200 cursor-pointer flex items-center gap-1"
                                        title="Edit payment amount / date / notes"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Revert payment for flat ${unitName} to unpaid status?`)) {
                                            revertMut.mutate(p.id);
                                          }
                                        }}
                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-bold border border-rose-200 cursor-pointer flex items-center gap-1"
                                        title="Revert payment back to unpaid"
                                      >
                                        <Undo2 className="w-3 h-3" />
                                        <span>Revert</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Credit Transactions Section (Editable for Admins) ── */}
            {isAdmin && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden space-y-4 p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      <span>Other Non-Maintenance Credit Transactions</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Record miscellaneous collections (donations, clubhouse bookings, penalty fines, event funds) for {getMonthLabel(month)}.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search credits..."
                        value={creditSearch}
                        onChange={e => setCreditSearch(e.target.value)}
                        className="w-full pl-8 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                      {creditSearch && (
                        <button onClick={() => setCreditSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                          ×
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setAddCreditModal({ ...addCreditModal, open: true })}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Credit Transaction</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50/75 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-2.5 text-center w-12">Sl No</th>
                        <SortHeader label="Date" col="date" activeCol={creditSortCol} dir={creditSortDir} onSort={(c) => handleTableSort(c, creditSortCol, creditSortDir, setCreditSortCol, setCreditSortDir)} />
                        <SortHeader label="Particulars / Description" col="description" activeCol={creditSortCol} dir={creditSortDir} onSort={(c) => handleTableSort(c, creditSortCol, creditSortDir, setCreditSortCol, setCreditSortDir)} />
                        <SortHeader label="Category" col="category" activeCol={creditSortCol} dir={creditSortDir} onSort={(c) => handleTableSort(c, creditSortCol, creditSortDir, setCreditSortCol, setCreditSortDir)} />
                        <SortHeader label="Amount (₹)" col="amount" activeCol={creditSortCol} dir={creditSortDir} onSort={(c) => handleTableSort(c, creditSortCol, creditSortDir, setCreditSortCol, setCreditSortDir)} align="right" />
                        <th className="px-4 py-2.5 text-left">Reference / Notes</th>
                        <th className="px-4 py-2.5 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredNonMaintenanceCredits.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                            No non-maintenance credit transactions recorded for {getMonthLabel(month)}.
                          </td>
                        </tr>
                      ) : (
                        filteredNonMaintenanceCredits.map((c, idx) => (
                          <tr key={c.id} className="hover:bg-slate-50/75 transition-colors">
                            <td className="px-4 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-slate-600">{formatDate(c.transaction_date || c.created_at)}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-800">{c.description || 'Other Credit'}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                {c.category || 'OTHER'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                              {formatCurrency(c.amount || 0)}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{c.reference_number || '—'}</td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setEditTxModal({
                                    open: true,
                                    id: c.id,
                                    description: c.description || '',
                                    category: c.category || 'other',
                                    amount: c.amount || '',
                                    transaction_date: c.transaction_date ? String(c.transaction_date).slice(0, 10) : '',
                                    transaction_type: 'income',
                                    reference_number: c.reference_number || ''
                                  })}
                                  className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors"
                                  title="Edit credit transaction"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete credit transaction: ${c.description} (₹${c.amount})?`)) {
                                      deleteTxMut.mutate(c.id);
                                    }
                                  }}
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                                  title="Delete transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {nonMaintenanceCredits.length > 0 && (
                      <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                        <tr>
                          <td colSpan={4} className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                            Total Other Credits:
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-emerald-600 font-extrabold">
                            {formatCurrency(totalOtherCredits)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Total Realized Income Banner */}
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <span className="font-semibold text-emerald-900">
                    Total Income for {getMonthLabel(month)}: Maintenance Collected (₹{Number(totalPaid || 0).toLocaleString()}) + Other Credits (₹{Number(totalOtherCredits || 0).toLocaleString()})
                  </span>
                  <span className="text-base font-extrabold text-emerald-700">
                    = ₹{Number(totalMonthlyIncome || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
           SUB-TAB 2: EXPENDITURE (EXACT SPREADSHEET FORMAT)
      ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'expenditure' && (
          <div className="space-y-6">
            {/* Header Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-rose-600" />
                  <span>Monthly Expenditure Ledger ({getMonthLabel(month)})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clean itemized debits and expenses matching society passbook records. Visible to all residents.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search expenditures..."
                    value={expenditureSearch}
                    onChange={e => setExpenditureSearch(e.target.value)}
                    className="w-full pl-8 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                  />
                  {expenditureSearch && (
                    <button onClick={() => setExpenditureSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                      ×
                    </button>
                  )}
                </div>
                <div className="bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-800">
                  Total Expenses: ₹{Number(totalExpenditure || 0).toLocaleString()}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setAddDebitModal({ ...addDebitModal, open: true })}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Expense / Debit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Spreadsheet Table (styled exactly matching user's Excel screenshot) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-black text-white font-bold tracking-wider text-xs">
                      <DarkSortHeader label="Sl No" col="index" activeCol={expenditureSortCol} dir={expenditureSortDir} onSort={(c) => handleTableSort(c, expenditureSortCol, expenditureSortDir, setExpenditureSortCol, setExpenditureSortDir)} className="w-16 sticky left-0 z-10 bg-black shadow-[1px_0_0_0_#334155]" />
                      <DarkSortHeader label="Expense Date" col="date" activeCol={expenditureSortCol} dir={expenditureSortDir} onSort={(c) => handleTableSort(c, expenditureSortCol, expenditureSortDir, setExpenditureSortCol, setExpenditureSortDir)} className="w-36" />
                      <DarkSortHeader label="Particulars / Description" col="description" activeCol={expenditureSortCol} dir={expenditureSortDir} onSort={(c) => handleTableSort(c, expenditureSortCol, expenditureSortDir, setExpenditureSortCol, setExpenditureSortDir)} align="left" />
                      <DarkSortHeader label="Category" col="category" activeCol={expenditureSortCol} dir={expenditureSortDir} onSort={(c) => handleTableSort(c, expenditureSortCol, expenditureSortDir, setExpenditureSortCol, setExpenditureSortDir)} className="w-32" />
                      <DarkSortHeader label="Amount (₹)" col="amount" activeCol={expenditureSortCol} dir={expenditureSortDir} onSort={(c) => handleTableSort(c, expenditureSortCol, expenditureSortDir, setExpenditureSortCol, setExpenditureSortDir)} className="w-36" />
                      {isAdmin && <th className="border border-slate-700 px-3 py-2.5 text-center w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
                    {sortedExpenditures.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400 italic">
                          No expenditure records found for {getMonthLabel(month)}.
                        </td>
                      </tr>
                    ) : (
                      sortedExpenditures.map((e, index) => (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-200 px-4 py-2 text-center font-bold text-slate-700 sticky left-0 z-10 bg-white hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0]">
                            {index + 1}
                          </td>
                          <td className="border border-slate-200 px-4 py-2 text-center text-slate-800">
                            {formatDate(e.transaction_date || e.created_at)}
                          </td>
                          <td className="border border-slate-200 px-6 py-2 text-center font-semibold text-slate-900">
                            {e.description || '—'}
                          </td>
                          <td className="border border-slate-200 px-4 py-2 text-center uppercase tracking-wider font-bold text-slate-700">
                            {e.category || 'OTHER'}
                          </td>
                          <td className="border border-slate-200 px-6 py-2 text-center font-bold text-slate-900">
                            {Number(e.amount || 0).toLocaleString()}
                          </td>
                          {isAdmin && (
                            <td className="border border-slate-200 px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setEditTxModal({
                                    open: true,
                                    id: e.id,
                                    description: e.description || '',
                                    category: e.category || 'utility',
                                    amount: e.amount || '',
                                    transaction_date: e.transaction_date ? String(e.transaction_date).slice(0, 10) : '',
                                    transaction_type: 'expense',
                                    reference_number: e.reference_number || ''
                                  })}
                                  className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors"
                                  title="Edit expenditure"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete expenditure: ${e.description} (₹${e.amount})?`)) {
                                      deleteTxMut.mutate(e.id);
                                    }
                                  }}
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                                  title="Delete expenditure"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Grand Total Footer exactly like screenshot bottom row */}
                  <tfoot>
                    <tr className="bg-white text-slate-950 font-extrabold text-sm border-t-2 border-slate-800">
                      <td className="border-t border-slate-200 px-4 py-2.5"></td>
                      <td className="border-t border-slate-200 px-4 py-2.5"></td>
                      <td className="border-t border-slate-200 px-6 py-2.5"></td>
                      <td className="border-t border-slate-200 px-4 py-2.5"></td>
                      <td className="border border-slate-800 px-6 py-2.5 text-center text-base tracking-wide font-black bg-slate-50">
                        {totalExpenditure}
                      </td>
                      {isAdmin && <td className="border-t border-slate-200 px-3 py-2.5"></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
           SUB-TAB 3: MONTHLY SUMMARY (DIVIDED INTO 2 HALVES - 6 COLUMNS)
      ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Top KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-semibold">Total Income</p>
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(totalMonthlyIncome)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Maint: {formatCurrency(totalPaid)} | Other: {formatCurrency(totalOtherCredits)}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-l-rose-500">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-semibold">Total Expenditure</p>
                  <ArrowDownLeft className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-xl font-black text-rose-600 mt-1">{formatCurrency(totalExpenditure)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{debitTransactions.length} Expense vouchers</p>
              </div>

              <div className={`bg-white p-4 rounded-xl shadow-xs border-l-4 ${netSurplusDeficit >= 0 ? 'border-l-indigo-500' : 'border-l-amber-500'
                }`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-semibold">Net Difference</p>
                  {netSurplusDeficit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <p className={`text-xl font-black mt-1 ${netSurplusDeficit >= 0 ? 'text-indigo-600' : 'text-amber-600'
                  }`}>
                  {formatCurrency(netSurplusDeficit)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {netSurplusDeficit >= 0 ? 'Monthly Net Surplus' : 'Monthly Net Deficit'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-l-sky-500">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-semibold">Collection Rate</p>
                  <Building2 className="w-4 h-4 text-sky-500" />
                </div>
                <p className="text-xl font-black text-sky-600 mt-1">
                  {totalDue > 0 ? `${Math.round((totalPaid / totalDue) * 100)}%` : '100%'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {paidFlats.length} of {payments.length} Flats Cleared
                </p>
              </div>
            </div>

            {/* ── Two Halves Split Layout (Clean Summary & Sortable/Filterable Tables) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Half: Income Summary (Flat Number, Amount, Date Paid) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Income Summary
                    </h3>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="relative flex-1 sm:w-44">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search income..."
                        value={summaryIncomeSearch}
                        onChange={e => setSummaryIncomeSearch(e.target.value)}
                        className="w-full pl-8 pr-6 py-1 text-xs border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                      {summaryIncomeSearch && (
                        <button onClick={() => setSummaryIncomeSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                          ×
                        </button>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 shrink-0">
                      Total: {formatCurrency(totalMonthlyIncome)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="min-w-full text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <SortHeader label="Flat / Unit" col="unit" activeCol={summaryIncomeSortCol} dir={summaryIncomeSortDir} onSort={(c) => handleTableSort(c, summaryIncomeSortCol, summaryIncomeSortDir, setSummaryIncomeSortCol, setSummaryIncomeSortDir)} className="w-40" />
                        <SortHeader label="Amount (₹)" col="amount" activeCol={summaryIncomeSortCol} dir={summaryIncomeSortDir} onSort={(c) => handleTableSort(c, summaryIncomeSortCol, summaryIncomeSortDir, setSummaryIncomeSortCol, setSummaryIncomeSortDir)} align="right" className="w-36" />
                        <SortHeader label="Date Paid" col="date" activeCol={summaryIncomeSortCol} dir={summaryIncomeSortDir} onSort={(c) => handleTableSort(c, summaryIncomeSortCol, summaryIncomeSortDir, setSummaryIncomeSortCol, setSummaryIncomeSortDir)} align="center" className="w-36" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredSummaryIncome.map(item => (
                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.isCredit ? 'bg-emerald-50/20' : ''}`}>
                          <td className="px-4 py-2 font-bold text-slate-900">
                            <span className={`px-2 py-0.5 rounded border text-[11px] ${item.isCredit
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}>
                              {item.unit}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal ml-1.5">
                              ({item.subtext})
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-extrabold text-emerald-600">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-2 text-center text-slate-600">
                            {item.date ? formatDate(item.date) : (item.isCredit ? '—' : 'Settled')}
                          </td>
                        </tr>
                      ))}

                      {filteredSummaryIncome.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400 italic">
                            No income records matching search for {getMonthLabel(month)}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                      <tr>
                        <td className="px-4 py-2.5 font-bold uppercase text-[11px] text-slate-600">Total Income</td>
                        <td className="px-4 py-2.5 text-right font-black text-emerald-600 text-sm">
                          {formatCurrency(totalMonthlyIncome)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-[10px] text-slate-400">
                          {filteredSummaryIncome.length} Records
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Right Half: Expenditure Summary (Purpose / Description, Amount, Date Paid) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-rose-700" />
                    <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                      Expenditure Summary
                    </h3>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="relative flex-1 sm:w-44">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search expenses..."
                        value={summaryExpSearch}
                        onChange={e => setSummaryExpSearch(e.target.value)}
                        className="w-full pl-8 pr-6 py-1 text-xs border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                      />
                      {summaryExpSearch && (
                        <button onClick={() => setSummaryExpSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                          ×
                        </button>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-rose-700 shrink-0">
                      Total: {formatCurrency(totalExpenditure)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="min-w-full text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <SortHeader label="Purpose / Description" col="description" activeCol={summaryExpSortCol} dir={summaryExpSortDir} onSort={(c) => handleTableSort(c, summaryExpSortCol, summaryExpSortDir, setSummaryExpSortCol, setSummaryExpSortDir)} />
                        <SortHeader label="Amount (₹)" col="amount" activeCol={summaryExpSortCol} dir={summaryExpSortDir} onSort={(c) => handleTableSort(c, summaryExpSortCol, summaryExpSortDir, setSummaryExpSortCol, setSummaryExpSortDir)} align="right" className="w-36" />
                        <SortHeader label="Date Paid" col="date" activeCol={summaryExpSortCol} dir={summaryExpSortDir} onSort={(c) => handleTableSort(c, summaryExpSortCol, summaryExpSortDir, setSummaryExpSortCol, setSummaryExpSortDir)} align="center" className="w-36" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredSummaryExpenditure.map(e => (
                        <tr key={`exp-${e.id}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 font-semibold text-slate-900">
                            <div>{e.description || 'General Expense'}</div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {e.category || 'OTHER'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-extrabold text-rose-600">
                            {formatCurrency(e.amount)}
                          </td>
                          <td className="px-4 py-2 text-center text-slate-600">
                            {e.transaction_date ? formatDate(e.transaction_date) : '—'}
                          </td>
                        </tr>
                      ))}

                      {filteredSummaryExpenditure.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400 italic">
                            No expenditure recorded for {getMonthLabel(month)}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                      <tr>
                        <td className="px-4 py-2.5 font-bold uppercase text-[11px] text-slate-600">Total Expenditure</td>
                        <td className="px-4 py-2.5 text-right font-black text-rose-600 text-sm">
                          {formatCurrency(totalExpenditure)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-[10px] text-slate-400">
                          {filteredSummaryExpenditure.length} Vouchers
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
           MODAL: ADD CREDIT / NON-MAINTENANCE INCOME
      ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={addCreditModal.open}
        onClose={() => setAddCreditModal({ ...addCreditModal, open: false })}
        title="Record Non-Maintenance Credit Income"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCreditMut.mutate({
              description: addCreditModal.description,
              category: addCreditModal.category,
              amount: addCreditModal.amount,
              transaction_date: addCreditModal.transaction_date,
              reference_number: addCreditModal.reference_number
            });
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Particulars / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Festival fund collection, Clubhouse booking, Donation"
              value={addCreditModal.description}
              onChange={e => setAddCreditModal({ ...addCreditModal, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={addCreditModal.category}
                onChange={e => setAddCreditModal({ ...addCreditModal, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="other">Other / Misc</option>
                <option value="donation">Donation</option>
                <option value="clubhouse">Clubhouse / Hall Booking</option>
                <option value="penalty">Penalty / Late Fee</option>
                <option value="move_in">Move-in / Move-out Deposit</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 5000"
                value={addCreditModal.amount}
                onChange={e => setAddCreditModal({ ...addCreditModal, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date Received</label>
              <input
                type="date"
                required
                value={addCreditModal.transaction_date}
                onChange={e => setAddCreditModal({ ...addCreditModal, transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reference / UTR / Receipt No.</label>
              <input
                type="text"
                placeholder="e.g. UPI-998822"
                value={addCreditModal.reference_number}
                onChange={e => setAddCreditModal({ ...addCreditModal, reference_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAddCreditModal({ ...addCreditModal, open: false })}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCreditMut.isPending}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {createCreditMut.isPending ? 'Saving...' : 'Save Credit Income'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
           MODAL: ADD DEBIT / EXPENDITURE
      ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={addDebitModal.open}
        onClose={() => setAddDebitModal({ ...addDebitModal, open: false })}
        title="Record Monthly Expenditure Voucher"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDebitMut.mutate({
              description: addDebitModal.description,
              category: addDebitModal.category,
              amount: addDebitModal.amount,
              transaction_date: addDebitModal.transaction_date,
              reference_number: addDebitModal.reference_number
            });
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Particulars / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BBMP, security Basant payment, NNG-BESCOM"
              value={addDebitModal.description}
              onChange={e => setAddDebitModal({ ...addDebitModal, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={addDebitModal.category}
                onChange={e => setAddDebitModal({ ...addDebitModal, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="utility">UTILITY (BESCOM, BWSSB)</option>
                <option value="salary">SALARY (Security, Cleaning)</option>
                <option value="security">SECURITY (CCTV, Whistle, Guard)</option>
                <option value="repair">REPAIR (Plumbing, Tank, Motor)</option>
                <option value="other">OTHER (Materials, Vendor, BBMP)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 12000"
                value={addDebitModal.amount}
                onChange={e => setAddDebitModal({ ...addDebitModal, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                required
                value={addDebitModal.transaction_date}
                onChange={e => setAddDebitModal({ ...addDebitModal, transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor / Bill No.</label>
              <input
                type="text"
                placeholder="e.g. Invoice #1029"
                value={addDebitModal.reference_number}
                onChange={e => setAddDebitModal({ ...addDebitModal, reference_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAddDebitModal({ ...addDebitModal, open: false })}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDebitMut.isPending}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {createDebitMut.isPending ? 'Saving...' : 'Save Expenditure'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
           MODAL: EDIT TRANSACTION (CREDIT OR DEBIT)
      ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={editTxModal.open}
        onClose={() => setEditTxModal({ ...editTxModal, open: false })}
        title={`Edit ${editTxModal.transaction_type === 'income' ? 'Income Transaction' : 'Expenditure Entry'}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateTxMut.mutate({
              id: editTxModal.id,
              data: {
                description: editTxModal.description,
                category: editTxModal.category,
                amount: editTxModal.amount,
                transaction_date: editTxModal.transaction_date,
                reference_number: editTxModal.reference_number
              }
            });
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Particulars / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editTxModal.description}
              onChange={e => setEditTxModal({ ...editTxModal, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={editTxModal.category}
                onChange={e => setEditTxModal({ ...editTxModal, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {editTxModal.transaction_type === 'income' ? (
                  <>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other / Misc</option>
                    <option value="donation">Donation</option>
                    <option value="clubhouse">Clubhouse Booking</option>
                    <option value="penalty">Penalty / Fine</option>
                  </>
                ) : (
                  <>
                    <option value="utility">UTILITY (BESCOM, BWSSB)</option>
                    <option value="salary">SALARY (Security, Cleaning)</option>
                    <option value="security">SECURITY (CCTV, Whistle, Guard)</option>
                    <option value="repair">REPAIR (Plumbing, Tank, Motor)</option>
                    <option value="other">OTHER (Materials, Vendor, BBMP)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={editTxModal.amount}
                onChange={e => setEditTxModal({ ...editTxModal, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={editTxModal.transaction_date}
                onChange={e => setEditTxModal({ ...editTxModal, transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reference / Invoice / Notes</label>
              <input
                type="text"
                value={editTxModal.reference_number}
                onChange={e => setEditTxModal({ ...editTxModal, reference_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditTxModal({ ...editTxModal, open: false })}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTxMut.isPending}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {updateTxMut.isPending ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
           MODAL: RECORD MAINTENANCE PAYMENT
      ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={payModal.open}
        onClose={() => setPayModal({ ...payModal, open: false })}
        title={`${payModal.isEdit ? 'Edit Maintenance Payment' : 'Record Payment'} - Flat ${payModal.payment?.unit_number || payModal.payment?.unit || ''}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              paid_amount: parseFloat(payModal.paidAmount || payModal.payment.due_amount),
              paid_date: payModal.paidDate,
              payment_method: payModal.paymentMethod || 'UPI',
              notes: payModal.notes
            };
            if (payModal.payerResidentId) {
              payload.resident_id = parseInt(payModal.payerResidentId);
            }
            payMut.mutate({
              id: payModal.payment.id,
              data: payload
            });
          }}
          className="space-y-4 text-xs"
        >
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Unit / Flat:</span>
              <span className="font-bold text-slate-900">{payModal.payment?.unit_number || payModal.payment?.unit}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-500">Bill Due Amount:</span>
              <span className="font-bold text-slate-700">{formatCurrency(payModal.payment?.due_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-500">Currently Billed:</span>
              <span className="font-semibold text-slate-800">{payModal.payment?.resident_name || 'Unassigned'}</span>
            </div>
          </div>

          {isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Paid / Billed Resident
                </label>
                {payModalFlatResidents.length > 0 && (
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {payModalFlatResidents.length} in flat
                  </span>
                )}
              </div>
              <select
                value={String(payModal.payerResidentId || '')}
                onChange={e => setPayModal({ ...payModal, payerResidentId: e.target.value })}
                className="w-full px-3 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                {payModalFlatResidents.length === 0 ? (
                  <option value="">-- No resident profile linked to flat --</option>
                ) : !payModal.payerResidentId ? (
                  <option value="">-- Select Resident ({payModalFlatResidents.length} in flat) --</option>
                ) : null}
                {(payModalFlatResidents.length > 0 ? payModalFlatResidents : [...residents].sort(sortFlats)).map(r => (
                  <option key={r.id} value={String(r.id)} className="text-slate-900 bg-white py-1">
                    {r.owner_name} {r.ownership_type ? `(${r.ownership_type.toUpperCase()})` : ''} {r.owner_phone ? `• ${r.owner_phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Paid Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={payModal.paidAmount}
              onChange={e => setPayModal({ ...payModal, paidAmount: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={payModal.paymentMethod || 'UPI'}
              onChange={e => setPayModal({ ...payModal, paymentMethod: e.target.value })}
              className="w-full px-3 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Paid Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={payModal.paidDate}
              onChange={e => setPayModal({ ...payModal, paidDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Reference / Notes (optional)</label>
            <input
              type="text"
              placeholder="e.g. GPay / IMPS Ref 12345"
              value={payModal.notes}
              onChange={e => setPayModal({ ...payModal, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={() => setPayModal({ ...payModal, open: false })}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={payMut.isPending}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {payMut.isPending ? 'Saving...' : (payModal.isEdit ? 'Save Payment Changes' : 'Confirm Settle Payment')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
           MODAL: EDIT RESIDENT / PAYER
      ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={editResidentModal.open}
        onClose={() => setEditResidentModal({ ...editResidentModal, open: false })}
        title={`Change Billed Resident - Flat ${editResidentModal.payment?.unit_number || editResidentModal.payment?.unit || ''}`}
      >
        <div className="space-y-4 text-xs">
          <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-indigo-700 font-medium block">Current Flat Unit</span>
              <span className="font-bold text-sm text-indigo-900">{editResidentModal.payment?.unit_number || editResidentModal.payment?.unit}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Currently Billed</span>
              <span className="font-semibold text-xs text-slate-800">{editResidentModal.payment?.resident_name || 'Unassigned'}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Select Resident for this Flat
              </label>
              {editModalFlatResidents.length > 0 && (
                <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {editModalFlatResidents.length} resident{editModalFlatResidents.length > 1 ? 's' : ''} in flat
                </span>
              )}
            </div>
            <select
              value={String(editResidentModal.residentId || '')}
              onChange={e => setEditResidentModal({ ...editResidentModal, residentId: e.target.value })}
              className="w-full px-3 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose Resident of Flat {editResidentModal.payment?.unit_number || editResidentModal.payment?.unit} --</option>
              {(showAllResidentsInModal || editModalFlatResidents.length === 0 ? [...residents].sort(sortFlats) : editModalFlatResidents).map(r => (
                <option key={r.id} value={String(r.id)} className="text-slate-900 bg-white py-1">
                  {r.owner_name} {r.ownership_type ? `(${r.ownership_type.toUpperCase()})` : ''} {r.owner_phone ? `• ${r.owner_phone}` : ''}
                </option>
              ))}
            </select>
            {editModalFlatResidents.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                No resident profile explicitly tagged to this flat. Showing all apartment residents.
              </p>
            )}
          </div>

          {editModalFlatResidents.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="showAllResCheck"
                checked={showAllResidentsInModal}
                onChange={e => setShowAllResidentsInModal(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 text-xs"
              />
              <label htmlFor="showAllResCheck" className="text-[11px] text-slate-500 cursor-pointer select-none">
                Show residents from other flats (advanced)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditResidentModal({ ...editResidentModal, open: false })}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updateResidentMut.isPending || !editResidentModal.residentId}
              onClick={() => {
                updateResidentMut.mutate({
                  id: editResidentModal.payment.id,
                  residentId: parseInt(editResidentModal.residentId)
                });
              }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {updateResidentMut.isPending ? 'Updating...' : 'Assign Resident'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
           MODAL: EDIT BILL AMOUNT
      ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={editBillModal.open}
        onClose={() => setEditBillModal({ ...editBillModal, open: false })}
        title={`Edit Bill Amount - Flat ${editBillModal.payment?.unit_number || editBillModal.payment?.unit || ''}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Maintenance Due Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="50"
              value={editBillModal.amount}
              onChange={e => setEditBillModal({ ...editBillModal, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditBillModal({ ...editBillModal, open: false })}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updateBillMut.isPending || !editBillModal.amount}
              onClick={() => {
                updateBillMut.mutate({
                  id: editBillModal.payment.id,
                  amount: editBillModal.amount
                });
              }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {updateBillMut.isPending ? 'Updating...' : 'Save Bill Amount'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
