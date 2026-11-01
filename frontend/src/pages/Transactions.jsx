import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import MonthNavigator, { getMonthDisplay } from '../components/ui/MonthNavigator';
import { StatCard } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { 
  Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  BookOpen, Landmark, Calendar, Download, RefreshCw, 
  Receipt, CheckCircle2, ChevronRight 
} from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Transactions() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  const rawRole = (currentUser?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' (Cr) | 'expense' (Dr)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isAllTime, setIsAllTime] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Maintenance',
    type: 'income',
    amount: '',
    payment_method: 'UPI',
    resident: ''
  });

  // 1. Fetch Passbook Summary (All-time Inflow, Outflow, Net Balance)
  const { data: summaryData } = useQuery({
    queryKey: ['transactions-summary'],
    queryFn: async () => {
      try {
        const res = await transactionsApi.getSummary();
        return res.data;
      } catch (err) {
        return null;
      }
    }
  });

  // 2. Fetch All Transactions
  const { data: rawTxs = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        const res = await transactionsApi.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.transactions || []);
        return Array.isArray(list) ? list : [];
      } catch (err) {
        console.warn('Transactions getAll error:', err);
        return [];
      }
    }
  });

  const txs = Array.isArray(rawTxs) ? rawTxs : [];

  // Compute Running Balance chronologically (oldest to newest)
  const txsWithRunningBalance = useMemo(() => {
    // Clone and sort chronologically: oldest first
    const sortedAsc = [...txs].sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.date || a.created_at).getTime();
      const dateB = new Date(b.transaction_date || b.date || b.created_at).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.id || 0) - (b.id || 0);
    });

    let running = 0;
    const computed = sortedAsc.map(t => {
      const isIncome = (t.transaction_type || t.type) === 'income';
      const amt = Number(t.amount) || 0;
      if (isIncome) {
        running += amt;
      } else {
        running -= amt;
      }
      return {
        ...t,
        running_balance: running
      };
    });

    // Return in reverse chronological order (newest first for passbook view)
    return computed.reverse();
  }, [txs]);

  // Extract available months for period filter
  const availableMonths = useMemo(() => {
    return Array.from(new Set(
      txs.map(t => {
        const d = t.transaction_date || t.date;
        return d ? d.slice(0, 7) : null;
      }).filter(Boolean)
    )).sort().reverse();
  }, [txs]);

  // Filter transactions
  const filteredTxs = useMemo(() => {
    return txsWithRunningBalance.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const res = (t.resident || t.resident_name || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = desc.includes(q) || res.includes(q) || cat.includes(q);

      const actualType = (t.transaction_type || t.type || '').toLowerCase();
      const matchesType = typeFilter === 'all' || actualType === typeFilter;

      const itemMonth = (t.transaction_date || t.date || '').slice(0, 7);
      const matchesMonth = isAllTime || itemMonth === selectedMonth;

      return matchesSearch && matchesType && matchesMonth;
    });
  }, [txsWithRunningBalance, search, typeFilter, selectedMonth, isAllTime]);

  // Compute period totals
  const periodTotals = useMemo(() => {
    let creditTotal = 0;
    let debitTotal = 0;
    filteredTxs.forEach(t => {
      const isIncome = (t.transaction_type || t.type) === 'income';
      const amt = Number(t.amount) || 0;
      if (isIncome) creditTotal += amt;
      else debitTotal += amt;
    });
    return {
      credits: creditTotal,
      debits: debitTotal,
      net: creditTotal - debitTotal
    };
  }, [filteredTxs]);

  const createMutation = useMutation({
    mutationFn: (newTx) => transactionsApi.create(newTx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      toast.success('Passbook entry recorded successfully!');
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'Maintenance',
        type: 'income',
        amount: '',
        payment_method: 'UPI',
        resident: ''
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to record transaction');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('Please enter a valid transaction amount.');
      return;
    }
    createMutation.mutate({
      ...formData,
      amount: Number(formData.amount),
      transaction_date: formData.date,
      transaction_type: formData.type
    });
  };

  const formatMonthLabel = (mStr) => {
    if (!mStr || mStr === 'all') return 'All Time';
    const [year, month] = mStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Export to CSV helper
  const exportToCSV = () => {
    if (filteredTxs.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    const headers = ['Date', 'Particulars/Narration', 'Category', 'Ref/Entity', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance'];
    const rows = filteredTxs.map(t => {
      const isIncome = (t.transaction_type || t.type) === 'income';
      return [
        t.transaction_date || t.date || '',
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.category || '',
        `"${(t.resident || t.resident_name || '').replace(/"/g, '""')}"`,
        !isIncome ? t.amount : '',
        isIncome ? t.amount : '',
        t.running_balance || ''
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Society_Passbook_Statement_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Passbook statement exported as CSV');
  };

  const availableBalance = summaryData?.available_balance ?? periodTotals.net;
  const totalIncome = summaryData?.total_income ?? periodTotals.credits;
  const totalExpense = summaryData?.total_expense ?? periodTotals.debits;

  return (
    <div className="space-y-6">
      {/* Top Passbook Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" /> Society Bank Passbook
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Official running passbook ledger of maintenance collections, vendor payouts, and net bank balance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Statement
          </button>

          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:from-indigo-700 hover:to-purple-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Passbook Entry
            </button>
          )}
        </div>
      </div>

      {/* Passbook Account Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Bank Balance */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 p-5 rounded-2xl shadow-xl text-white border border-indigo-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between text-indigo-200 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Bank Balance</span>
            <Landmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-emerald-400">
            {formatCurrency(availableBalance)}
          </div>
          <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Live cumulative ledger
          </p>
        </div>

        {/* Card 2: Total Deposits (Cr.) */}
        <StatCard
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600" />}
          title="Total Deposits (Cr.)"
          value={formatCurrency(totalIncome)}
          change="Inflow collections & dues"
        />

        {/* Card 3: Total Withdrawals (Dr.) */}
        <StatCard
          icon={<ArrowUpRight className="w-5 h-5 text-rose-600" />}
          title="Total Withdrawals (Dr.)"
          value={formatCurrency(totalExpense)}
          change="Expenses, AMC & vendor payouts"
        />

        {/* Card 4: Ledger Entries */}
        <StatCard
          icon={<Receipt className="w-5 h-5 text-indigo-600" />}
          title="Total Passbook Entries"
          value={txs.length}
          change={`Showing ${filteredTxs.length} matching`}
        />
      </div>

      {/* Passbook Filter & Period Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search narration, resident name, category, cheque/ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Entries (Cr &amp; Dr)</option>
              <option value="income">Deposits Only (Credit Cr.)</option>
              <option value="expense">Withdrawals Only (Debit Dr.)</option>
            </select>

            {/* Month Filter Selector */}
            <MonthNavigator
              month={selectedMonth}
              onChangeMonth={setSelectedMonth}
              isAllTime={isAllTime}
              onToggleAllTime={setIsAllTime}
            />
          </div>
        </div>

        {/* Selected Month Summary Ribbon */}
        {!isAllTime && (
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-100">
            <span>
              Period: <strong>{getMonthDisplay(selectedMonth)}</strong> • Credits: <span className="text-emerald-700 font-mono">+{formatCurrency(periodTotals.credits)}</span> • Debits: <span className="text-rose-700 font-mono">-{formatCurrency(periodTotals.debits)}</span>
            </span>
            <button
              onClick={() => setIsAllTime(true)}
              className="text-indigo-600 hover:text-indigo-800 underline text-xs ml-2 cursor-pointer"
            >
              Show All Time
            </button>
          </div>
        )}

        {/* Bank Passbook Table */}
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
            <p className="font-semibold text-slate-600">No passbook entries found for this selection</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting another month or adjusting your search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 font-sans">
              <thead className="bg-slate-100/80 text-slate-700">
                <tr>
                  <th className="sticky left-0 bg-slate-100 z-20 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                    Txn Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider min-w-[220px]">
                    Particulars / Narration
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Ref / Entity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50/40">
                    Withdrawal (Dr. ₹)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50/40">
                    Deposit (Cr. ₹)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-indigo-950 bg-indigo-50/40">
                    Balance (₹)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-xs">
                {filteredTxs.map((t, idx) => {
                  const isIncome = (t.transaction_type || t.type) === 'income';
                  const dateStr = t.transaction_date || t.date || t.created_at;

                  return (
                    <tr 
                      key={t.id || idx} 
                      className={`hover:bg-slate-50/90 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                    >
                      {/* Sticky Date */}
                      <td className="sticky left-0 bg-inherit z-10 px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-800 text-center border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                        {formatDate(dateStr)}
                      </td>

                      {/* Particulars / Description */}
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="leading-snug">{t.description}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize border border-slate-200">
                          {t.category || 'General'}
                        </span>
                      </td>

                      {/* Resident / Entity */}
                      <td className="px-4 py-3 whitespace-nowrap text-center text-slate-600 font-medium">
                        {t.resident || t.resident_name || (t.unit_number ? `Unit ${t.unit_number}` : '—')}
                      </td>

                      {/* Withdrawal (Dr.) */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-rose-600 bg-rose-50/20">
                        {!isIncome ? formatCurrency(t.amount) : '—'}
                      </td>

                      {/* Deposit (Cr.) */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-emerald-600 bg-emerald-50/20">
                        {isIncome ? formatCurrency(t.amount) : '—'}
                      </td>

                      {/* Running Balance */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-slate-900 bg-indigo-50/20">
                        {t.running_balance !== undefined ? formatCurrency(t.running_balance) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Passbook Entry Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Bank Passbook Entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Entry Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="income">Deposit (Credit Cr.)</option>
                <option value="expense">Withdrawal (Debit Dr.)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 2750"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Particulars / Narration <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly Maintenance A-101 or Lift AMC Servicing"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Maintenance">Maintenance</option>
                <option value="Utility">Utility (BESCOM/Water)</option>
                <option value="Salary">Salary (Security/Staff)</option>
                <option value="AMC">AMC / Contracts</option>
                <option value="Repair">Repair &amp; Plumbing</option>
                <option value="Other">Other / Misc</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ref / Entity / Resident</label>
              <input
                type="text"
                placeholder="e.g. Flat NNG-TF2 or Contractor"
                value={formData.resident}
                onChange={e => setFormData({ ...formData, resident: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Channel</label>
              <select
                value={formData.payment_method}
                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="UPI">UPI / QR</option>
                <option value="NEFT">NEFT / NetBanking</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {createMutation.isPending ? 'Recording...' : 'Record Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
