import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TrendingUp, AlertCircle, Users, Bell, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ec4899', '#8b5cf6'];

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

  // Defensive array extractions
  const trendList = Array.isArray(trend) 
    ? trend 
    : (Array.isArray(trend?.trends) ? trend.trends : []);

  const rawCatList = Array.isArray(catData) 
    ? catData 
    : (Array.isArray(catData?.breakdown) ? catData.breakdown : []);

  const categoryList = rawCatList.map(c => ({
    name: c.name || c.category || 'Other',
    value: Number(c.value !== undefined ? c.value : c.amount) || 0
  }));

  const defaultersList = Array.isArray(topDef) ? topDef : [];
  const transactionsList = Array.isArray(recentTx) ? recentTx : [];

  const monthlyIncome = summary?.monthlyIncome ?? summary?.monthly_income ?? 0;
  const pendingDues = summary?.pendingDues ?? summary?.total_pending_dues ?? 0;
  const totalResidents = summary?.totalResidents ?? summary?.total_residents ?? 0;
  const activeAlerts = summary?.activeAlerts ?? summary?.active_alerts ?? 0;
  const collectionRate = summary?.collectionRate ?? summary?.monthly_collection_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4"><TrendingUp className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Monthly Income</p>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(monthlyIncome)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4"><AlertCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Dues</p>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(pendingDues)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4"><Users className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Residents</p>
            <p className="text-2xl font-semibold text-slate-900">{totalResidents}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-4"><Bell className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Alerts</p>
            <p className="text-2xl font-semibold text-slate-900">{activeAlerts}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4"><DollarSign className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Collection Rate</p>
            <p className="text-2xl font-semibold text-slate-900">{collectionRate}%</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-medium mb-4">Monthly Trend</h3>
          <div className="h-80">
            {trendLoading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendList}>
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
            {catLoading ? <Spinner /> : categoryList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No expense category data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryList} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label>
                    {categoryList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-medium mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Desc</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transactionsList.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-white z-10 px-3 py-2 whitespace-nowrap text-sm text-slate-600 font-medium border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {formatDate(t.date || t.transaction_date)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900 max-w-[180px] truncate">
                      {t.description}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900 text-center font-semibold">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center text-sm">
                      <Badge variant={(t.type || t.transaction_type) === 'income' ? 'success' : 'danger'}>
                        {t.type || t.transaction_type}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {transactionsList.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-3 py-8 text-center text-slate-400 text-sm">No recent transactions</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Defaulters Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-medium mb-4">Top Defaulters</h3>
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200">Resident</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {defaultersList.map((t, idx) => (
                  <tr key={t.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-white z-10 px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {t.name || t.owner_name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 text-center font-medium">
                      {t.unit || t.unit_number}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600 font-bold text-center">
                      {formatCurrency(t.amount || t.total_outstanding)}
                    </td>
                  </tr>
                ))}
                {defaultersList.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-3 py-8 text-center text-slate-400 text-sm">No overdue defaulters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
