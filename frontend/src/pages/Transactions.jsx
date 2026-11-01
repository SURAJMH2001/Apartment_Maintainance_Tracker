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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Resident</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {txs.map(t => (
                <tr key={t.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{t.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 capitalize">{t.category}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge variant={t.type === 'income' ? 'success' : 'danger'}>{t.type}</Badge></td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{t.resident || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
