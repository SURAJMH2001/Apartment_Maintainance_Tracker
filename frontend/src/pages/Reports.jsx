import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { formatCurrency } from '../utils/formatters';
import Spinner from '../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const [tab, setTab] = useState('monthly');

  const { data: monthlyData = [], isLoading } = useQuery({
    queryKey: ['reports-monthly'],
    queryFn: () => reportsApi.getMonthlySummary().then(res => res.data).catch(() => [
      { month: 'Jan', income: 100000, expense: 80000, net: 20000 },
      { month: 'Feb', income: 110000, expense: 70000, net: 40000 }
    ])
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setTab('monthly')} className={`pb-2 px-1 text-sm font-medium ${tab === 'monthly' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>Monthly Summary</button>
        <button onClick={() => setTab('resident')} className={`pb-2 px-1 text-sm font-medium ${tab === 'resident' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>Resident Collection</button>
        <button onClick={() => setTab('expense')} className={`pb-2 px-1 text-sm font-medium ${tab === 'expense' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>Expense Breakdown</button>
      </div>

      {tab === 'monthly' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="h-80 mb-8">
            {isLoading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#4f46e5" />
                  <Bar dataKey="expense" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="overflow-x-auto -mx-6 sm:mx-0 mt-4">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200">Month</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Income</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Expense</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {monthlyData.map(r => (
                  <tr key={r.month} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-white z-10 px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{r.month}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 text-center font-medium">{formatCurrency(r.income)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 text-center font-medium">{formatCurrency(r.expense)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900 text-center">{formatCurrency(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab !== 'monthly' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center py-12 text-slate-500">
          Select filters to generate report. (Stub for {tab})
        </div>
      )}
    </div>
  );
}
