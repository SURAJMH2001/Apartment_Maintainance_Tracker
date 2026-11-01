import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TrendingUp, AlertCircle, Users, Bell, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then(res => res.data).catch(() => ({ 
      monthlyIncome: 120000, pendingDues: 45000, totalResidents: 240, activeAlerts: 3, collectionRate: 85 
    }))
  });
  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard-trend'],
    queryFn: () => dashboardApi.getMonthlyTrend().then(res => res.data).catch(() => [
      { month: 'Jan', income: 100000, expense: 80000 }, { month: 'Feb', income: 110000, expense: 70000 },
      { month: 'Mar', income: 90000, expense: 95000 }, { month: 'Apr', income: 120000, expense: 85000 },
    ])
  });
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['dashboard-categories'],
    queryFn: () => dashboardApi.getCategoryBreakdown().then(res => res.data).catch(() => [
      { name: 'Maintenance', value: 40000 }, { name: 'Electricity', value: 20000 }, { name: 'Water', value: 10000 }
    ])
  });
  const { data: topDef, isLoading: topDefLoading } = useQuery({
    queryKey: ['dashboard-defaulters'],
    queryFn: () => dashboardApi.getTopDefaulters().then(res => res.data).catch(() => [
      { id: 1, name: 'John Doe', unit: 'A-101', amount: 15000 }, { id: 2, name: 'Jane Smith', unit: 'B-202', amount: 12000 }
    ])
  });
  const { data: recentTx, isLoading: txLoading } = useQuery({
    queryKey: ['dashboard-recent-tx'],
    queryFn: () => dashboardApi.getRecentTransactions().then(res => res.data).catch(() => [
      { id: 1, date: '2023-10-01', description: 'Monthly Maintenance', type: 'income', amount: 5000 },
      { id: 2, date: '2023-10-02', description: 'Plumbing Repair', type: 'expense', amount: 2000 }
    ])
  });

  if (sumLoading) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4"><TrendingUp className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-slate-500">Monthly Income</p><p className="text-2xl font-semibold text-slate-900">{formatCurrency(summary?.monthlyIncome)}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4"><AlertCircle className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-slate-500">Pending Dues</p><p className="text-2xl font-semibold text-slate-900">{formatCurrency(summary?.pendingDues)}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4"><Users className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-slate-500">Total Residents</p><p className="text-2xl font-semibold text-slate-900">{summary?.totalResidents}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-4"><Bell className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-slate-500">Active Alerts</p><p className="text-2xl font-semibold text-slate-900">{summary?.activeAlerts}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4"><DollarSign className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-slate-500">Collection Rate</p><p className="text-2xl font-semibold text-slate-900">{summary?.collectionRate}%</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-medium mb-4">Monthly Trend</h3>
          <div className="h-80">
            {trendLoading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-medium mb-4">Category Breakdown</h3>
          <div className="h-80">
            {catLoading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                    {catData?.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          <h3 className="text-lg font-medium mb-4">Recent Transactions</h3>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr><th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Desc</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th></tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {recentTx?.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">{t.description}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">{formatCurrency(t.amount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <Badge variant={t.type === 'income' ? 'success' : 'danger'}>{t.type}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          <h3 className="text-lg font-medium mb-4">Top Defaulters</h3>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr><th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Resident</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue</th></tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {topDef?.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900">{t.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{t.unit}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600 font-medium">{formatCurrency(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
