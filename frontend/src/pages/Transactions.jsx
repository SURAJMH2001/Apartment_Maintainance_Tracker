import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Transactions() {
  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getAll().then(res => res.data).catch(() => [
      { id: 1, date: '2023-10-01', description: 'Monthly Maintenance A-101', category: 'maintenance', type: 'income', amount: 5000, resident: 'John Doe' },
      { id: 2, date: '2023-10-02', description: 'Plumbing Repair', category: 'repair', type: 'expense', amount: 2000, resident: null }
    ])
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium">Add Transaction</button>
      </div>
      
      {isLoading ? <Spinner /> : (
        <div className="overflow-x-auto relative">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider shadow-[1px_0_0_0_#e2e8f0]">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Resident</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {txs.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center shadow-[1px_0_0_0_#e2e8f0] font-medium">{formatDate(t.date || t.transaction_date || t.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 text-center font-medium">{t.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center capitalize">{t.category}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Badge variant={t.type === 'income' || t.transaction_type === 'income' ? 'success' : 'danger'}>{t.type || t.transaction_type}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900 text-center">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">{t.resident || t.resident_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
