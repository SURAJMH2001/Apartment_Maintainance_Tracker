import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Phone, Clock, User, Send, Wrench, Droplets,
  Zap, Wind, Package, AlertCircle, Calendar, CheckCircle, Search,
  ShieldAlert, Sparkles, Filter, CheckCircle2, MapPin, Mail,
  MessageSquare, Trash2, ArrowRight
} from 'lucide-react';
import { StatCard } from '../components/ui';
import Spinner from '../components/ui/Spinner';
import { issuesApi } from '../api/maintenance';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

import MonthNavigator, { getMonthDisplay } from '../components/ui/MonthNavigator';

export default function ReportIssue() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('maintenance');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [statusFilter, setStatusFilter] = useState('all');

  // Calendar / Month Selection
  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isAllTime, setIsAllTime] = useState(false);

  // Comment input per issue state: { [issueId]: commentText }
  const [commentInputs, setCommentInputs] = useState({});
  // Expanded comments accordion state: { [issueId]: boolean }
  const [expandedComments, setExpandedComments] = useState({});

  const [formData, setFormData] = useState({
    name: user?.display_name || user?.name || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    unit: user?.unit_number || '',
    category: 'maintenance',
    priority: 'medium',
    title: '',
    description: '',
    location: '',
    dateNeeded: new Date().toISOString().split('T')[0],
    timeNeeded: 'Morning (9 AM - 12 PM)',
  });

  // Keep form initialized with active user's DB display name, phone and unit
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.display_name || user.name || prev.name || user.username || '',
        email: user.email || prev.email || '',
        phone: user.phone || prev.phone || '',
        unit: user.unit_number || user.flat_number || prev.unit || ''
      }));
    }
  }, [user]);

  const categories = [
    { id: 'maintenance', name: 'General Maintenance', icon: <Wrench className="w-4 h-4 text-indigo-500" /> },
    { id: 'plumbing', name: 'Plumbing & Water', icon: <Droplets className="w-4 h-4 text-cyan-500" /> },
    { id: 'electrical', name: 'Electrical & Power', icon: <Zap className="w-4 h-4 text-amber-500" /> },
    { id: 'security', name: 'Security & Access', icon: <ShieldAlert className="w-4 h-4 text-rose-500" /> },
    { id: 'amenity', name: 'Clubhouse / Lift / Garden', icon: <Package className="w-4 h-4 text-emerald-500" /> },
  ];

  const timeSlots = [
    'Morning (9 AM - 12 PM)',
    'Afternoon (12 PM - 4 PM)',
    'Evening (4 PM - 8 PM)',
    'Anytime / Urgent'
  ];

  const { data: rawIssues = [], isLoading } = useQuery({
    queryKey: ['issues'],
    queryFn: async () => {
      try {
        const res = await issuesApi.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.issues || []);
        return Array.isArray(list) ? list : [];
      } catch (err) {
        console.warn('Backend issues fetch failed:', err);
        return [];
      }
    },
  });

  const issues = Array.isArray(rawIssues) ? rawIssues : [];

  const submitMutation = useMutation({
    mutationFn: (data) =>
      issuesApi.create({
        ...data,
        category: selectedCategory,
        priority: selectedPriority,
        description: `${data.description}${data.dateNeeded ? ` [Preferred Date: ${data.dateNeeded}]` : ''}${data.timeNeeded ? ` [Preferred Time: ${data.timeNeeded}]` : ''}`
      }),
    onSuccess: () => {
      toast.success('Maintenance ticket raised successfully! Service team notified.');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setFormData({
        name: user?.display_name || user?.username || '',
        email: user?.email || '',
        phone: '',
        unit: user?.unit_number || '',
        category: 'maintenance',
        priority: 'medium',
        title: '',
        description: '',
        location: '',
        dateNeeded: new Date().toISOString().split('T')[0],
        timeNeeded: 'Morning (9 AM - 12 PM)',
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit report. Please try again.');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => issuesApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Issue status updated');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: () => {
      toast.error('Failed to update issue status');
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ id, comment }) => issuesApi.addComment(id, { comment }),
    onSuccess: (_, vars) => {
      toast.success('Comment posted');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setCommentInputs(prev => ({ ...prev, [vars.id]: '' }));
      setExpandedComments(prev => ({ ...prev, [vars.id]: true }));
    },
    onError: () => {
      toast.error('Failed to post comment');
    }
  });

  const reactMutation = useMutation({
    mutationFn: ({ id, emoji }) => issuesApi.react(id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: () => {
      toast.error('Failed to react');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => issuesApi.delete(id),
    onSuccess: () => {
      toast.success('Issue ticket deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete issue');
    }
  });

  // Extract available months from existing issues
  const availableMonths = Array.from(new Set(
    issues.map(iss => {
      const dt = iss.created_at || iss.date;
      if (!dt) return null;
      return dt.slice(0, 7);
    }).filter(Boolean)
  )).sort().reverse();

  const currentMonthStr = getCurrentMonth();
  if (!availableMonths.includes(currentMonthStr)) {
    availableMonths.unshift(currentMonthStr);
  }

  // Filter issues based on selected month / period
  const periodFilteredIssues = issues.filter((item) => {
    if (isAllTime) return true;
    const itemMonth = (item.created_at || item.date || '').slice(0, 7);
    return itemMonth === selectedMonth;
  });

  // Dynamically calculate stats for the chosen period
  const stats = {
    totalIssues: periodFilteredIssues.length,
    pending: periodFilteredIssues.filter((i) => i.status === 'pending' || i.status === 'open').length,
    inProgress: periodFilteredIssues.filter((i) => i.status === 'in_progress').length,
    resolved: periodFilteredIssues.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
  };

  // Search & Status filter applied to period items
  const filteredIssues = periodFilteredIssues.filter((item) => {
    const matchesSearch =
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.unit || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && (item.status === 'pending' || item.status === 'open')) ||
      (statusFilter === 'in_progress' && item.status === 'in_progress') ||
      (statusFilter === 'resolved' && (item.status === 'resolved' || item.status === 'closed'));
    return matchesSearch && matchesStatus;
  });

  const formatPeriodLabel = () => {
    if (isAllTime) return 'All Time';
    return getMonthDisplay(selectedMonth);
  };

  const formatMonthLabel = (mStr) => {
    if (!mStr || mStr === 'all' || isAllTime) return 'All Time';
    return getMonthDisplay(mStr);
  };

  const PriorityBadge = ({ priority }) => {
    const p = (priority || 'medium').toLowerCase();
    const colors = {
      low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      medium: 'bg-amber-50 text-amber-700 border-amber-200',
      high: 'bg-orange-50 text-orange-700 border-orange-200',
      critical: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase ${colors[p] || colors.medium}`}>
        {p}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const s = (status || 'pending').toLowerCase();
    const colors = {
      pending: 'bg-amber-100 text-amber-800',
      open: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-emerald-100 text-emerald-800',
      closed: 'bg-slate-100 text-slate-800',
    };
    const labels = {
      pending: 'Pending',
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[s] || colors.pending}`}>
        {labels[s] || s}
      </span>
    );
  };

  const EMOJI_OPTIONS = ['👍', '❤️', '👏', '🛠️', '⚠️'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-7 h-7 text-rose-600" /> Report Maintenance Issue
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Log facility repairs, plumbing, electrical faults, and track resolution in real time.
          </p>
        </div>

        {/* Month Navigator with All Time Toggle */}
        <MonthNavigator
          month={selectedMonth}
          onChangeMonth={setSelectedMonth}
          isAllTime={isAllTime}
          onToggleAllTime={setIsAllTime}
        />
      </div>

      {/* Metric Cards - Dynamically calculated for Selected Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          title={`Total Issues (${formatPeriodLabel()})`}
          value={stats.totalIssues}
          change={isAllTime ? 'All historical tickets' : `Period: ${formatPeriodLabel()}`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          title="Pending Action"
          value={stats.pending}
          change="Needs technician"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          title="In Progress"
          value={stats.inProgress}
          change="Under repair"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          title="Resolved"
          value={stats.resolved}
          change="Fixed tickets"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Issues List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header & Filter */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search issues by title, unit, name, description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {!isAllTime && (
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-rose-700 bg-rose-50/80 px-3 py-1.5 rounded-lg border border-rose-100">
                  <span>Filtered to: <strong>{formatPeriodLabel()}</strong> ({filteredIssues.length} tickets)</span>
                  <button
                    onClick={() => setIsAllTime(true)}
                    className="text-rose-600 hover:text-rose-800 underline ml-2 cursor-pointer"
                  >
                    Reset to All Time
                  </button>
                </div>
              )}
            </div>

            {/* Tickets */}
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Spinner />
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="font-semibold text-slate-700">No issues found for {formatPeriodLabel()}</p>
                <p className="text-xs text-slate-400 mt-1">All maintenance issues are addressed or no records in this period.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredIssues.map((item) => (
                  <div key={item.id} className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {(item.name || item.unit || 'I').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
                              <PriorityBadge priority={item.priority} />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {item.unit ? `Unit: ${item.unit} • ` : ''}Category: <span className="capitalize">{item.category}</span>
                              {item.location && ` • Location: ${item.location}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Admin Quick Status Update */}
                            {isAdmin ? (
                              <select
                                value={item.status || 'pending'}
                                onChange={(e) => updateStatusMutation.mutate({ id: item.id, status: e.target.value })}
                                className="text-xs font-semibold px-2 py-1 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            ) : (
                              <StatusBadge status={item.status} />
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete issue "${item.title}"?`)) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                                title="Delete ticket"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed mb-3">
                          {item.description}
                        </p>

                        {/* Admin Official Response Highlight if present */}
                        {item.admin_response && (
                          <div className="mb-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                            <span className="font-bold flex items-center gap-1 text-emerald-700 mb-0.5">
                              <CheckCircle className="w-3.5 h-3.5" /> Official Management Response:
                            </span>
                            <p>{item.admin_response}</p>
                          </div>
                        )}

                        {/* Meta Info Bar */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            Logged: {new Date(item.created_at || item.date || Date.now()).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {(item.date_needed || item.time_needed) && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Preferred: {item.date_needed || ''} {item.time_needed ? `(${item.time_needed})` : ''}
                            </span>
                          )}
                          {item.name && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <User className="w-3.5 h-3.5" />
                              Reported by {item.name}
                            </span>
                          )}

                          {/* Comments Toggle Button */}
                          <button
                            onClick={() => setExpandedComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="ml-auto flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {(item.comments?.length || 0)} Comments
                          </button>
                        </div>

                        {/* Reactions Bar */}
                        <div className="mt-3 pt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400 mr-1">Reactions:</span>
                          {EMOJI_OPTIONS.map((emoji) => {
                            const count = item.reactions_summary?.[emoji] || 0;
                            const hasReacted = item.user_reactions?.includes(emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => reactMutation.mutate({ id: item.id, emoji })}
                                className={`px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                                  hasReacted
                                    ? 'bg-rose-100 border border-rose-300 text-rose-800 font-bold scale-105'
                                    : 'bg-slate-100/80 hover:bg-slate-200 border border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="text-[11px] font-semibold">{count}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Expandable Comments Section */}
                        {expandedComments[item.id] && (
                          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Ticket Activity &amp; Updates ({(item.comments || []).length})
                            </h4>

                            {/* Existing Comments */}
                            {(item.comments || []).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No comments yet. Post an update below.</p>
                            ) : (
                              <div className="space-y-2">
                                {item.comments.map((c) => (
                                  <div
                                    key={c.id}
                                    className={`p-2.5 rounded-lg text-xs ${
                                      c.is_admin
                                        ? 'bg-indigo-50/90 border border-indigo-200 text-indigo-950'
                                        : 'bg-white border border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="font-bold flex items-center gap-1.5">
                                        {c.author_name}
                                        {c.author_unit && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-normal">
                                            {c.author_unit}
                                          </span>
                                        )}
                                        {c.is_admin && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold">
                                            Admin
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(c.created_at).toLocaleTimeString('en-IN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          day: 'numeric',
                                          month: 'short'
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 leading-snug">{c.comment}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Comment Input */}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const txt = commentInputs[item.id]?.trim();
                                if (!txt) return;
                                addCommentMutation.mutate({ id: item.id, comment: txt });
                              }}
                              className="flex items-center gap-2 pt-2"
                            >
                              <input
                                type="text"
                                placeholder="Add an update or response..."
                                value={commentInputs[item.id] || ''}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <button
                                type="submit"
                                disabled={addCommentMutation.isPending || !commentInputs[item.id]?.trim()}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" /> Post
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Raise Maintenance Ticket Form */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-orange-700 p-6 rounded-2xl shadow-xl text-white border border-rose-400/20 relative overflow-hidden">
            {/* Glow Orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
              <h3 className="text-lg font-bold">Raise Maintenance Ticket</h3>
            </div>
            <p className="text-xs text-rose-100 mb-5">
              Submit an issue with preferred date/time slot to notify society staff.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.title.trim() || !formData.description.trim()) {
                  toast.error('Please enter both issue title and description.');
                  return;
                }
                submitMutation.mutate(formData);
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-rose-900/60 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-rose-900/60 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <option value="low" className="bg-slate-900 text-white">Low</option>
                    <option value="medium" className="bg-slate-900 text-white">Medium</option>
                    <option value="high" className="bg-slate-900 text-white">High</option>
                    <option value="critical" className="bg-slate-900 text-white">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-rose-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Unit / Flat
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NNG-102"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-rose-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9845012345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-rose-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Exact Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor Corridor"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-rose-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                  Issue Summary
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water dripping from ceiling joint"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-rose-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                  Description
                </label>
                <textarea
                  required
                  placeholder="Describe the issue in detail..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-rose-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all resize-none"
                />
              </div>

              {/* Preferred Visit Date and Slot */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.dateNeeded}
                    onChange={(e) => setFormData({ ...formData, dateNeeded: e.target.value })}
                    className="w-full px-3 py-1.5 bg-rose-900/60 border border-white/20 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rose-100 uppercase mb-1">
                    Preferred Slot
                  </label>
                  <select
                    value={formData.timeNeeded}
                    onChange={(e) => setFormData({ ...formData, timeNeeded: e.target.value })}
                    className="w-full px-2 py-1.5 bg-rose-900/60 border border-white/20 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts} value={ts} className="bg-slate-900 text-white">
                        {ts}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-white text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitMutation.isPending ? 'Logging Ticket...' : 'Submit Issue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
