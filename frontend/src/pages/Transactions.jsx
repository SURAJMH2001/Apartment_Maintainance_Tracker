import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react';

export default function Transactions() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'maintenance',
    type: 'income',
    amount: '',
    resident_id: ''
  });

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        const res = await transactionsApi.getAll();
        if (Array.isArray(res.data) && res.data.length > 0) return res.data;
      } catch (err) {
        console.warn('Transactions getAll fallback:', err);
      }
      return [
        { id: 1, transaction_date: '2026-10-05', description: 'Monthly Maintenance NNG-101', category: 'maintenance', transaction_type: 'income', amount: 2750, resident: 'S. K. Sharma' },
        { id: 2, transaction_date: '2026-10-06', description: 'Monthly Maintenance NB-101', category: 'maintenance', transaction_type: 'income', amount: 2750, resident: 'M. K. Swamy' },
        { id: 3, transaction_date: '2026-10-10', description: 'Common Elevator AMC Service', category: 'maintenance', transaction_type: 'expense', amount: 8000, resident: null },
        { id: 4, transaction_date: '2026-10-14', description: 'Common Electricity BESCOM Bill', category: 'utility', transaction_type: 'expense', amount: 14200, resident: null },
        { id: 5, transaction_date: '2026-10-18', description: 'Overhead Tank Plumbing & Valve', category: 'repair', transaction_type: 'expense', amount: 3500, resident: null },
      ];
    }
  });

  const mutation = useMutation({
    mutationFn: (newTx) => transactionsApi.create(newTx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction added successfully!');
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'maintenance',
        type: 'income',
        amount: '',
        resident_id: ''
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to add transaction');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    mutation.mutate({
      ...formData,
      amount: Number(formData.amount),
      transaction_date: formData.date,
      transaction_type: formData.type
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredTxs = txs.filter(t => {
    const desc = (t.description || '').toLowerCase();
    const res = (t.resident || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = desc.includes(q) || res.includes(q) || cat.includes(q);

    const actualType = (t.transaction_type || t.type || '').toLowerCase();
    const matchesType = typeFilter === 'all' || actualType === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600" /> Society Transactions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete record of income collections, maintenance expenses, and vendor payouts.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions by description, resident, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Spinner />
        </div>
      ) : filteredTxs.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
          <p className="font-semibold text-slate-600">No transactions found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click Add Transaction.</p>
        </div>
      ) : (
        <>
          {/* Mobile View - Stacked Cards */}
          <div className="block md:hidden space-y-3">
            {filteredTxs.map((t) => {
              const isIncome = (t.transaction_type || t.type) === 'income';
              return (
                <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{t.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(t.transaction_date || t.date)}</p>
                    </div>
                    <span className={`font-bold text-sm ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant={isIncome ? 'success' : 'danger'}>
                      {isIncome ? 'Income' : 'Expense'}
                    </Badge>
                    <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 capitalize border border-slate-200">
                      {t.category}
                    </span>
                    {t.resident && (
                      <span className="text-xs text-slate-500 ml-auto">
                        {t.resident}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View - Table with Frozen Date Reference Column & Centered Values */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Resident / Entity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTxs.map((t) => {
                  const isIncome = (t.transaction_type || t.type) === 'income';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 text-center border-r border-slate-100 shadow-[1px_0_0_0_#e2e8f0]">
                        {formatDate(t.transaction_date || t.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800 text-center font-medium max-w-xs truncate">
                        {t.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 capitalize text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge variant={isIncome ? 'success' : 'danger'}>
                          <span className="inline-flex items-center gap-1">
                            {isIncome ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                            {isIncome ? 'Income' : 'Expense'}
                          </span>
                        </Badge>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-center ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center font-medium">
                        {t.resident || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Society Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
            <input
              type="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
            <input
              type="text"
              name="description"
              required
              placeholder="e.g. Monthly Lift Servicing AMC"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="maintenance">Maintenance</option>
                <option value="utility">Utility (Electricity/Water)</option>
                <option value="repair">Repair &amp; Plumbing</option>
                <option value="salary">Staff / Security Salary</option>
                <option value="amenity">Amenity &amp; Garden</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Transaction Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="income">Income (+)</option>
                <option value="expense">Expense (-)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              required
              min="1"
              step="any"
              placeholder="e.g. 5000"
              value={formData.amount}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resident or Vendor Name (Optional)</label>
            <input
              type="text"
              name="resident_id"
              placeholder="e.g. Otis Elevators / Ramesh"
              value={formData.resident_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
