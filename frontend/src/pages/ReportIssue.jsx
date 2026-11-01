import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi } from '../api/maintenance';
import { AlertTriangle, Phone, Clock, User, Send, Wrench, Droplets, Zap, Wind, Package, AlertCircle } from 'lucide-react';
import { SearchBar, StatCard } from '../components/ui';
import Spinner from '../components/ui/Spinner';

export default function ReportIssue() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('maintenance');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    unit: '',
    category: 'maintenance',
    priority: 'medium',
    title: '',
    description: '',
    location: '',
    dateNeeded: '',
    timeNeeded: '',
  });

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues'],
    queryFn: () => issuesApi.getAll().then(res => res.data).catch(() => []),
  });

  const { data: categories } = useQuery({
    queryKey: ['issue-categories'],
    queryFn: () => fetch('/api/issue-categories').then(res => res.json()).catch(() => [
      { id: 1, name: 'Maintenance', icon: Wrench },
      { id: 2, name: 'Plumbing', icon: Droplets },
      { id: 3, name: 'Electrical', icon: Zap },
      { id: 4, name: 'HVAC', icon: Wind },
      { id: 5, name: 'Appliances', icon: Package },
      { id: 6, name: 'Flooding', icon: Droplets },
      { id: 7, name: 'Other', icon: AlertTriangle },
    ]),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => issuesApi.create(data),
    onSuccess: () => {
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      alert('Issue reported successfully! We will get back to you soon.');
    },
  });

  const stats = {
    totalIssues: issues?.length || 0,
    pending: issues?.filter(i => i.status === 'pending')?.length || 0,
    inProgress: issues?.filter(i => i.status === 'in_progress')?.length || 0,
    resolved: issues?.filter(i => i.status === 'resolved')?.length || 0,
    critical: issues?.filter(i => i.priority === 'critical')?.length || 0,
  };

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  const filteredIssues = issues?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const PriorityBadge = ({ priority }) => {
    const colors = {
      critical: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-blue-100 text-blue-700',
    };
    const icons = {
      critical: AlertTriangle,
      high: AlertTriangle,
      medium: Clock,
      low: Clock,
    };
    const Icon = icons[priority];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colors[priority]}`}>
        <Icon className="w-4 h-4" />
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-blue-100 text-blue-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      escalated: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Report Issue</h1>
          <p className="text-slate-500 mt-1">Report maintenance issues or concerns</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-200"
        >
          <AlertTriangle className="w-5 h-5" />
          Report New Issue
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-rose-600" />}
          title="Total Issues"
          value={stats.totalIssues}
          change="This month"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          title="Pending"
          value={stats.pending}
          change="Needs attention"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          title="In Progress"
          value={stats.inProgress}
          change="Being resolved"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
          title="Resolved"
          value={stats.resolved}
          change="Completed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Reports</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reported issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredIssues?.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white font-bold">
                          {item.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{item.title}</h3>
                            <PriorityBadge priority={item.priority} />
                          </div>
                          <p className="text-sm text-slate-500">{item.unit} • {item.category}</p>
                        </div>
                      </div>
                      <p className="text-slate-600 mb-3">{item.description}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(item.date).toLocaleTimeString()}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-rose-500 to-orange-600 p-6 rounded-2xl shadow-lg shadow-rose-200 text-white">
            <h3 className="text-xl font-bold mb-4">Report New Issue</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                  >
                    {categories?.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <input
                type="text"
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
              />
              <input
                type="text"
                placeholder="Unit Number"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
              />
              <input
                type="text"
                placeholder="Issue Title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
              />
              <textarea
                placeholder="Describe the issue..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60 resize-none"
              />
              <button
                onClick={() => submitMutation.mutate(formData)}
                disabled={submitMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}