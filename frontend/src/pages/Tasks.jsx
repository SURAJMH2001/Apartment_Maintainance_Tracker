import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Filter, Plus, Clock, CheckCircle, AlertTriangle, 
  Hammer, Droplets, Zap, Wrench, Calendar, MapPin, User, CheckSquare, Trash2 
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { tasksApi } from '../api/maintenance';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/formatters';

const categoryIcons = {
  Electrical: Zap,
  Plumbing: Droplets,
  HVAC: Wrench,
  Maintenance: Hammer,
  Safety: AlertTriangle,
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Electrical',
    location: '',
    assignee: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'pending'
  });

  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        const res = await tasksApi.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.tasks || []);
        return Array.isArray(list) ? list : [];
      } catch (err) {
        console.warn('Tasks API fetch error:', err);
        return [];
      }
    }
  });

  const tasks = Array.isArray(rawTasks) ? rawTasks : [];

  const createMutation = useMutation({
    mutationFn: (data) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Maintenance task created successfully!');
      setIsModalOpen(false);
      setFormData({
        title: '',
        category: 'Electrical',
        location: '',
        assignee: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        status: 'pending'
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to create task');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => tasksApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task status updated');
    },
    onError: () => {
      toast.error('Failed to update task status');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete task');
    }
  });

  const filteredTasks = tasks.filter(task => {
    const title = (task.title || '').toLowerCase();
    const location = (task.location || '').toLowerCase();
    const assignee = (task.assignee || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = title.includes(q) || location.includes(q) || assignee.includes(q);
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 border-emerald-200 text-emerald-700';
      case 'pending': return 'bg-amber-100 border-amber-200 text-amber-700';
      case 'overdue': return 'bg-rose-100 border-rose-200 text-rose-700';
      default: return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default: return null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-600" /> Maintenance Tasks
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track and manage preventive maintenance, vendor work orders, and scheduled repairs.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title, location, assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Spinner />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Hammer className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
          <p className="font-semibold text-slate-600">No maintenance tasks found</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting your filter or click Create Task.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map(task => {
            const Icon = categoryIcons[task.category] || Hammer;
            return (
              <div 
                key={task.id} 
                className={`flex flex-col bg-white rounded-2xl border transition-all hover:shadow-md ${
                  task.status === 'overdue' ? 'border-rose-200 hover:border-rose-400' :
                  task.status === 'pending' ? 'border-amber-200 hover:border-amber-400' :
                  'border-emerald-200 hover:border-emerald-400'
                }`}
              >
                <div className={`p-4 rounded-t-2xl border-b flex items-center justify-between ${getStatusColor(task.status)} bg-opacity-20`}>
                  <span className="flex items-center gap-1.5 font-bold text-xs capitalize">
                    {getStatusIcon(task.status)}
                    {task.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-white/70">
                    {task.priority || 'medium'}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{task.category}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {task.title}
                    </h3>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    {task.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{task.location}</span>
                      </p>
                    )}
                    {task.assignee && (
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{task.assignee}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Due: {formatDate(task.due_date || task.date)}</span>
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {task.status !== 'completed' ? (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'completed' })}
                        className="flex-1 py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'pending' })}
                        className="flex-1 py-1.5 px-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        Reopen Task
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete task "${task.title}"?`)) {
                          deleteMutation.mutate(task.id);
                        }
                      }}
                      title="Delete task"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Maintenance Task">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Overhead Tank Cleaning"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Safety">Safety</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Due Date</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Block A Lift Lobby"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assignee / Vendor</label>
              <input
                type="text"
                placeholder="e.g. Otis Tech / Electrician"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
