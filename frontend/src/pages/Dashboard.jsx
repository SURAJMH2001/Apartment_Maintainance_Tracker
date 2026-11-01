import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import { paymentsApi } from '../api/payments';
import { residentsApi } from '../api/residents';
import { announcementsApi } from '../api/announcements';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingUp, AlertCircle, Users, Calendar, CheckCircle,
  Clock, AlertTriangle, Activity, MessageSquare, Plus,
  FileText, IndianRupee, Megaphone, Trash2, Home,
  Building2, ArrowRight, ShieldCheck, X, Edit3, Search, CreditCard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { SkeletonDashboard } from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import useAuthStore from '../store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin' || user?.role === 'superadmin' || user?.role === 'manager';
  const isSuperAdmin = user?.role === 'super-admin' || user?.role === 'superadmin';

  // For Admin dual-dashboard view: 'society' (Operations) or 'personal' (Own Flat Dues)
  const [adminTab, setAdminTab] = useState('society');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30days');

  // Announcement modal state
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState('normal');

  // Full View & Edit Payment States
  const [showFullViewModal, setShowFullViewModal] = useState(false);
  const [fullViewSearch, setFullViewSearch] = useState('');
  const [editPaymentModal, setEditPaymentModal] = useState({
    open: false,
    payment: null,
    amount: '',
    paidDate: '',
    method: 'Online / UPI',
    notes: '',
    status: 'paid'
  });

  // 1. Dashboard summary & trends (for society view)
  const { data: summary, isLoading: sumLoading } = useQuery({
    staleTime: 5 * 60 * 1000,
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then(res => res.data),
    enabled: isAdmin
  });

  const getMonthsForRange = (range) => {
    if (range === '30days') return 2;
    if (range === '90days') return 3;
    if (range === '1year') return 12;
    return 6;
  };

  const { data: trend = [], isLoading: trendLoading } = useQuery({
    staleTime: 5 * 60 * 1000,
    queryKey: ['dashboard-trend', selectedTimeRange],
    queryFn: () => dashboardApi.getMonthlyTrend(getMonthsForRange(selectedTimeRange)).then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.trends || []);
      return Array.isArray(list) ? list : [];
    }),
    enabled: isAdmin
  });

  const { data: catData = [], isLoading: catLoading } = useQuery({
    staleTime: 5 * 60 * 1000,
    queryKey: ['dashboard-categories'],
    queryFn: () => dashboardApi.getCategoryBreakdown().then(res => {
      const breakdown = Array.isArray(res.data) ? res.data : (res.data?.breakdown || []);
      return Array.isArray(breakdown) ? breakdown.map(item => ({ name: item.category || item.name || 'Other', value: Number(item.amount !== undefined ? item.amount : item.value) || 0 })) : [];
    }),
    enabled: isAdmin
  });

  const { data: topDef = [] } = useQuery({
    queryKey: ['dashboard-defaulters'],
    queryFn: () => dashboardApi.getTopDefaulters().then(res => {
      return res.data.map(item => ({
        id: item.resident_id || item.id,
        name: item.owner_name || item.name || 'Unknown',
        unit: item.unit_number || item.unit || 'Unknown',
        amount: item.total_outstanding || item.amount || 0
      }));
    }),
    enabled: isAdmin
  });

  const { data: recentTx = [] } = useQuery({
    queryKey: ['dashboard-recent-tx'],
    queryFn: () => dashboardApi.getRecentTransactions().then(res => {
      return res.data.map(item => ({
        id: item.id,
        date: item.transaction_date || item.date,
        description: item.description,
        type: item.transaction_type || item.type,
        amount: item.amount
      }));
    }),
    enabled: isAdmin
  });

  // 2. Announcements
  const { data: announcements = [], refetch: refetchAnnouncements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.getAll().then(res => res.data || []).catch(() => [])
  });

  const createAnnMutation = useMutation({
    mutationFn: (data) => announcementsApi.create(data),
    onSuccess: () => {
      toast.success('Society notice published successfully!');
      setShowAnnounceModal(false);
      setAnnTitle('');
      setAnnContent('');
      setAnnPriority('normal');
      queryClient.invalidateQueries(['announcements']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to publish announcement.');
    }
  });

  const deleteAnnMutation = useMutation({
    mutationFn: (id) => announcementsApi.delete(id),
    onSuccess: () => {
      toast.success('Notice deleted.');
      queryClient.invalidateQueries(['announcements']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete notice.');
    }
  });

  // 3. Payments for flat dues & history
  const { data: payments = [] } = useQuery({
    queryKey: ['dashboard-payments'],
    queryFn: () => paymentsApi.getAll().then(res => res.data || []).catch(() => [])
  });

  // Fetch residents to resolve flat details if needed
  const { data: residents = [] } = useQuery({
    queryKey: ['residents-list'],
    queryFn: () => residentsApi.getAll().then(res => res.data || []).catch(() => [])
  });

  // Calculate viewer / user target flat
  const userUnit = useMemo(() => {
    if (user?.unit_number) return user.unit_number;
    if (user?.flat_number) return user.flat_number;
    if (user?.resident_id) {
      const match = residents.find(r => String(r.id) === String(user.resident_id));
      if (match?.unit_number) return match.unit_number;
    }
    if (user?.email) {
      const matchEmail = residents.find(r => (r.owner_email || '').toLowerCase() === (user.email || '').toLowerCase());
      if (matchEmail?.unit_number) return matchEmail.unit_number;
    }
    return '';
  }, [user, residents]);

  // Mutation to update payment details
  const updatePaymentMut = useMutation({
    mutationFn: ({ id, data }) => paymentsApi.update(id, data),
    onSuccess: () => {
      toast.success('Payment updated successfully');
      setEditPaymentModal({
        open: false,
        payment: null,
        amount: '',
        paidDate: '',
        method: 'Online / UPI',
        notes: '',
        status: 'paid'
      });
      queryClient.invalidateQueries(['dashboard-payments']);
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['dashboard-summary']);
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update payment');
    }
  });

  const handleOpenEditPayment = (p) => {
    setEditPaymentModal({
      open: true,
      payment: p,
      amount: p.paid_amount > 0 ? String(p.paid_amount) : String(p.due_amount || 2750),
      paidDate: p.paid_date || new Date().toISOString().split('T')[0],
      method: p.payment_method || 'Online / UPI',
      notes: p.notes || '',
      status: p.status === 'paid' ? 'paid' : (p.status === 'partial' ? 'partial' : 'paid')
    });
  };

  const handleSavePaymentUpdate = (e) => {
    e.preventDefault();
    if (!editPaymentModal.payment) return;
    const paidAmt = parseFloat(editPaymentModal.amount) || 0;
    updatePaymentMut.mutate({
      id: editPaymentModal.payment.id,
      data: {
        paid_amount: paidAmt,
        paid_date: editPaymentModal.paidDate || null,
        payment_method: editPaymentModal.method,
        notes: editPaymentModal.notes,
        status: editPaymentModal.status
      }
    });
  };

  // Check if current user has an allocated apartment unit
  const hasAllocatedFlat = Boolean(userUnit || user?.resident_id || user?.unit_number || user?.flat_number);

  // Filter payments strictly for user's personal flat
  const personalFlatPayments = useMemo(() => {
    if (!hasAllocatedFlat) return [];
    return payments.filter(p => {
      const u = (p.unit_number || p.unit || p.flat_number || '').trim().toUpperCase();
      const targetU = userUnit ? userUnit.trim().toUpperCase() : '';
      const matchUnit = Boolean(targetU && u === targetU);
      const matchResId = Boolean(user?.resident_id && String(p.resident_id) === String(user.resident_id));
      return matchUnit || matchResId;
    });
  }, [payments, user, userUnit, hasAllocatedFlat]);

  const sortedPersonalPayments = useMemo(() => {
    return [...personalFlatPayments].sort((a, b) => {
      const mA = a.month || '';
      const mB = b.month || '';
      if (mA !== mB) return mB.localeCompare(mA);
      const dA = a.paid_date || a.created_at || '';
      const dB = b.paid_date || b.created_at || '';
      return dB.localeCompare(dA);
    });
  }, [personalFlatPayments]);

  const sortedFlatPayments = sortedPersonalPayments;
  const pendingBills = sortedPersonalPayments.filter(p => p.status !== 'paid');
  const paidBills = sortedPersonalPayments.filter(p => p.status === 'paid' || Number(p.paid_amount || 0) > 0);
  const last5FlatPayments = sortedPersonalPayments.slice(0, 5);

  const filteredFullViewPayments = useMemo(() => {
    if (!fullViewSearch.trim()) return sortedPersonalPayments;
    const q = fullViewSearch.toLowerCase();
    return sortedPersonalPayments.filter(p =>
      (p.month || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q) ||
      (p.payment_method || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      String(p.due_amount || '').includes(q) ||
      String(p.paid_amount || '').includes(q)
    );
  }, [sortedPersonalPayments, fullViewSearch]);

  if (isAdmin && sumLoading) return <div className="p-8"><SkeletonDashboard /></div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            {isSuperAdmin && (
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                Super Admin Access
              </span>
            )}
            {isAdmin && !isSuperAdmin && (
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                Admin
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">Welcome back, {user?.name || user?.username}</p>
        </div>

        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                window.print();
                toast.success('Preparing print / export view');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule Task
            </button>
          </div>
        )}
      </div>

      {/* Admin Dual Dashboard Switcher */}
      {isAdmin && (
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl max-w-md">
          <button
            onClick={() => setAdminTab('society')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${adminTab === 'society'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Building2 className="w-4 h-4" /> Society Operations & Analytics
          </button>
          <button
            onClick={() => setAdminTab('personal')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${adminTab === 'personal'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Home className="w-4 h-4" /> {hasAllocatedFlat ? `My Flat (${userUnit}) Dues` : 'My Flat Dues'}
            {hasAllocatedFlat && pendingBills.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>
        </div>
      )}

      {/* Reminder Banner for Admin if their personal flat has dues */}
      {isAdmin && adminTab === 'society' && hasAllocatedFlat && pendingBills.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-900 font-semibold">
                Personal Maintenance Due: Flat {userUnit || user?.unit_number || 'Linked Unit'}
              </p>
              <p className="text-xs text-amber-700">
                You have {pendingBills.length} unpaid maintenance bill(s) for your own flat.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAdminTab('personal')}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
          >
            View & Settle Flat Dues →
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. ADMIN SOCIETY OPERATIONS VIEW                          */}
      {/* ========================================================= */}
      {isAdmin && adminTab === 'society' ? (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Tasks</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary?.total_tasks ?? summary?.totalTasks ?? ((summary?.pending_tasks || 0) + (summary?.completed_tasks || 0) + (summary?.overdue_tasks || 0))}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary?.pending_tasks ?? summary?.pendingTasks ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue Items</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary?.overdue_tasks ?? summary?.overdueTasks ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Completed (This Month)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary?.completed_tasks ?? summary?.completedTasks ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900">Financial Overview</h3>
                  <p className="text-sm text-slate-500">Monthly society income and expense trends</p>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {['30days', '90days', '1year'].map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedTimeRange(r)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedTimeRange === r ? 'bg-white shadow text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {r === '30days' ? '30 Days' : r === '90days' ? '90 Days' : '1 Year'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[300px] w-full">
                {trendLoading ? <SkeletonDashboard /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => '₹' + (val / 1000) + 'k'} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => formatCurrency(value)} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-6">Expense Categories</h3>
              <div className="h-[250px] w-full flex items-center justify-center">
                {catLoading ? <SkeletonDashboard /> : (!Array.isArray(catData) || catData.length === 0) ? (
                  <div className="text-center text-slate-400">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                    <p className="text-xs font-semibold text-slate-600">No Expenses Recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Society expense breakdown will appear as transactions are added.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={catData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {catData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" height={36} iconType="square" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Defaulters & Announcements Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Defaulters */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">Outstanding Society Dues</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Top pending payments by apartment flat</p>
                </div>
                <Link to="/payments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  Manage All Payments →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Flat</th>
                      <th className="px-6 py-3 text-left">Resident</th>
                      <th className="px-6 py-3 text-right">Outstanding</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topDef.slice(0, 5).map((def) => (
                      <tr key={def.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{def.unit}</td>
                        <td className="px-6 py-3.5 text-slate-700">{def.name}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-rose-600">{formatCurrency(def.amount)}</td>
                        <td className="px-6 py-3.5 text-center">
                          <Link to="/payments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                            Notify / Settle
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {topDef.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-6 text-center text-slate-400 text-xs">
                          No pending defaulters recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Society Announcements Component */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">Society Announcements</h3>
                </div>
                <button
                  onClick={() => setShowAnnounceModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Post Notice
                </button>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 hover:bg-slate-50 transition-colors relative group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {ann.priority === 'high' || ann.priority === 'urgent' ? (
                          <Badge variant="danger">High Priority</Badge>
                        ) : ann.priority === 'emergency' ? (
                          <Badge variant="danger">Emergency</Badge>
                        ) : (
                          <Badge variant="info">Notice</Badge>
                        )}
                        <span className="text-xs text-slate-400">{formatDate(ann.created_at)}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this announcement?')) {
                            deleteAnnMutation.mutate(ann.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{ann.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-3">{ann.content}</p>
                    {ann.created_by && (
                      <p className="text-[11px] text-slate-400 mt-2 italic">By: {ann.created_by}</p>
                    )}
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active announcements. Click "Post Notice" to inform residents.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. PERSONAL FLAT VIEW (RESIDENT / ADMIN FLAT VIEW)        */
        /* ========================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {!hasAllocatedFlat ? (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center space-y-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Administrator Account (No Flat Allocated)</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    You are logged in as a website administrator (<span className="font-semibold text-slate-700">{user?.username || 'admin'}</span>). Since no residential flat unit is allocated to this account, you have no maintenance bills, payments, or dues.
                  </p>
                </div>
                {isAdmin && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setAdminTab('society')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Building2 className="w-4 h-4" /> Go to Society Operations & Analytics
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Flat Identification Banner */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Flat: {userUnit || user?.unit_number || 'Apartment Unit'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Resident: {user?.name || user?.username} {user?.role ? `(${user.role})` : ''}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/payments"
                    className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    Payment Portal →
                  </Link>
                </div>

                {/* ACTION REQUIRED (MAINTENANCE DUES) - POSITIONED AT TOP */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" /> Action Required (Maintenance Dues)
                    </h3>
                    {pendingBills.length > 0 && (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                        {pendingBills.length} Bill{pendingBills.length > 1 ? 's' : ''} Pending
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    {pendingBills.length > 0 ? (
                      <div className="space-y-3">
                        {pendingBills.map(bill => {
                          const balance = Number(bill.due_amount || 0) - Number(bill.paid_amount || 0);
                          return (
                            <div key={bill.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                  <AlertCircle className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-900">
                                    Flat Maintenance - {bill.month}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Due Date: {formatDate(bill.due_date)} • Status: <span className="font-semibold uppercase text-amber-700">{bill.status}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900 text-base">{formatCurrency(balance)}</p>
                                <Link to="/payments" className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                                  Pay Now →
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-emerald-900">All Dues Cleared!</h4>
                            <p className="text-xs text-emerald-600">You have no pending maintenance bills for your flat.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-emerald-700">Up to date</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FLAT PAYMENT HISTORY - LAST 5 MONTHS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 text-indigo-600" /> Flat Payment History
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Recent 5 months maintenance receipts and payment details for Flat {userUnit || user?.unit_number || ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFullViewModal(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Full View →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase">
                        <tr>
                          <th className="px-6 py-3 text-left">Period / Month</th>
                          <th className="px-6 py-3 text-left">Paid By</th>
                          <th className="px-6 py-3 text-left">Date Paid</th>
                          <th className="px-6 py-3 text-left">Method</th>
                          <th className="px-6 py-3 text-right">Amount Paid</th>
                          <th className="px-6 py-3 text-center">Status</th>
                          {isAdmin && <th className="px-4 py-3 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {last5FlatPayments.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3.5 font-bold text-slate-900">{item.month}</td>
                            <td className="px-6 py-3.5 text-slate-700">
                              {item.resident_name || user?.name || 'Resident'}
                            </td>
                            <td className="px-6 py-3.5 text-slate-500 text-xs">
                              {item.paid_date ? formatDate(item.paid_date) : '—'}
                            </td>
                            <td className="px-6 py-3.5 text-slate-600 text-xs font-medium">
                              {item.payment_method || (item.status === 'paid' ? 'Online / UPI' : '—')}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                              {item.paid_amount > 0 ? formatCurrency(item.paid_amount) : (item.status === 'paid' ? formatCurrency(item.due_amount) : '₹0')}
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              {item.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Settled
                                </span>
                              ) : item.status === 'partial' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                  Partial
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                  Pending
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPayment(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                                  title="Update payment details for this month"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Update
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}

                        {last5FlatPayments.length === 0 && (
                          <tr>
                            <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-400 text-xs">
                              No previous payment records found yet for this unit.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Right Column: Society Announcements */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">Society Announcements</h3>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowAnnounceModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Notice
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-5 hover:bg-slate-50 transition-colors relative group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {ann.priority === 'high' || ann.priority === 'urgent' ? (
                          <Badge variant="danger">High Priority</Badge>
                        ) : ann.priority === 'emergency' ? (
                          <Badge variant="danger">Emergency</Badge>
                        ) : (
                          <Badge variant="info">Notice</Badge>
                        )}
                        <span className="text-xs text-slate-400">{formatDate(ann.created_at)}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this announcement?')) {
                              deleteAnnMutation.mutate(ann.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h4 className="font-medium text-slate-900 mb-1">{ann.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{ann.content}</p>
                    {ann.created_by && (
                      <p className="text-[11px] text-slate-400 mt-2 italic">By: {ann.created_by}</p>
                    )}
                  </div>
                ))}

                {announcements.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active society announcements at this time.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Announcement Modal (Admin Only) */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Post Society Announcement</h3>
              </div>
              <button
                onClick={() => setShowAnnounceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!annTitle.trim() || !annContent.trim()) {
                  toast.error('Please fill in title and message.');
                  return;
                }
                createAnnMutation.mutate({
                  title: annTitle.trim(),
                  content: annContent.trim(),
                  priority: annPriority
                });
              }}
              className="space-y-4 pt-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water Tank Maintenance, Festival Celebration..."
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority / Category</label>
                <select
                  value={annPriority}
                  onChange={e => setAnnPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="normal">Normal Notice</option>
                  <option value="high">High Priority</option>
                  <option value="emergency">Emergency Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Details</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write notice instructions or announcement details for residents..."
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAnnMutation.isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100"
                >
                  {createAnnMutation.isLoading ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FULL VIEW MODAL: ALL MONTHS & PAYMENTS FOR FLAT ── */}
      {showFullViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] my-auto flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Flat Payment Full View — Flat {userUnit || user?.unit_number || 'Unit'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? "Complete month-by-month record of maintenance and payments. Update any month's payment details below."
                      : "Complete month-by-month record of maintenance and payments for your flat."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullViewModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Summary Stats in Full View */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Months</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">{sortedPersonalPayments.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Total Paid</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {formatCurrency(sortedPersonalPayments.reduce((sum, p) => sum + (Number(p.paid_amount) || (p.status === 'paid' ? Number(p.due_amount || 0) : 0)), 0))}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending Dues</span>
                  <p className="text-xl font-extrabold text-amber-700 mt-0.5">
                    {formatCurrency(sortedPersonalPayments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + Math.max(0, (Number(p.due_amount || 0) - Number(p.paid_amount || 0))), 0))}
                  </p>
                </div>
              </div>

              {/* Filter / Search Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by month (e.g. 2026-09), status, method, or notes..."
                    value={fullViewSearch}
                    onChange={e => setFullViewSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {fullViewSearch && (
                  <button
                    type="button"
                    onClick={() => setFullViewSearch('')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* All Months Table - overflow-x-auto enables smooth horizontal scrolling on mobile */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Period / Month</th>
                      <th className="px-4 py-3 text-right">Due Amount</th>
                      <th className="px-4 py-3 text-right">Paid Amount</th>
                      <th className="px-4 py-3 text-left">Date Paid</th>
                      <th className="px-4 py-3 text-left">Method</th>
                      <th className="px-4 py-3 text-left">Notes / Ref</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {isAdmin && <th className="px-4 py-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredFullViewPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-extrabold text-slate-900">{p.month}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">
                          {formatCurrency(p.due_amount || 2750)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {p.paid_amount > 0 ? formatCurrency(p.paid_amount) : (p.status === 'paid' ? formatCurrency(p.due_amount) : '₹0')}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {p.paid_date ? formatDate(p.paid_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {p.payment_method || (p.status === 'paid' ? 'Online / UPI' : '—')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]" title={p.notes || ''}>
                          {p.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Settled
                            </span>
                          ) : p.status === 'partial' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              Pending
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayment(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Update
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {filteredFullViewPayments.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-slate-400">
                          No matching records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFullViewModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Full View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPDATE PAYMENT MODAL (FOR RESIDENT OR ADMIN) ── */}
      {editPaymentModal.open && editPaymentModal.payment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Update Payment — {editPaymentModal.payment.month}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Flat: {userUnit || user?.unit_number || editPaymentModal.payment.unit || ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditPaymentModal({ open: false, payment: null, amount: '', paidDate: '', method: 'Online / UPI', notes: '', status: 'paid' })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentUpdate} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">Maintenance Due:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(editPaymentModal.payment.due_amount || 2750)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={editPaymentModal.status}
                  onChange={e => setEditPaymentModal(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="paid">Settled / Paid</option>
                  <option value="partial">Partial Payment</option>
                  <option value="pending">Pending / Unpaid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editPaymentModal.amount}
                  onChange={e => setEditPaymentModal(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="2750"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Paid</label>
                  <input
                    type="date"
                    required={editPaymentModal.status !== 'pending'}
                    value={editPaymentModal.paidDate}
                    onChange={e => setEditPaymentModal(prev => ({ ...prev, paidDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={editPaymentModal.method}
                    onChange={e => setEditPaymentModal(prev => ({ ...prev, method: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Online / UPI">Online / UPI</option>
                    <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Reference / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref 429182394, GPay, or remarks..."
                  value={editPaymentModal.notes}
                  onChange={e => setEditPaymentModal(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditPaymentModal({ open: false, payment: null, amount: '', paidDate: '', method: 'Online / UPI', notes: '', status: 'paid' })}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePaymentMut.isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100 transition-colors cursor-pointer"
                >
                  {updatePaymentMut.isLoading ? 'Saving...' : 'Save & Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
