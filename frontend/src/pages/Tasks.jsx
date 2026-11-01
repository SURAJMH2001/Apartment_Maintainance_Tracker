import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Plus, Clock, CheckCircle, AlertTriangle, Hammer, Droplets, Zap, Wrench } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { toast } from 'react-hot-toast';

const INITIAL_TASKS = [
  { id: 1, title: 'Fix Elevator 3', category: 'Electrical', status: 'overdue', date: '2023-10-25', priority: 'critical', assignee: 'John Doe', location: 'Building B' },
  { id: 2, title: 'Annual HVAC Service', category: 'HVAC', status: 'pending', date: '2023-11-15', priority: 'medium', assignee: 'Jane Smith', location: 'All Blocks' },
  { id: 3, title: 'Lobby Light Replacement', category: 'Electrical', status: 'completed', date: '2023-10-20', priority: 'low', assignee: 'Mike Johnson', location: 'Tower A' },
  { id: 4, title: 'Pool Cleaning', category: 'Maintenance', status: 'pending', date: '2023-11-01', priority: 'medium', assignee: 'Pool Co.', location: 'Clubhouse' },
  { id: 5, title: 'Leaking Pipe in Basement', category: 'Plumbing', status: 'overdue', date: '2023-10-28', priority: 'high', assignee: 'John Doe', location: 'Tower C' },
  { id: 6, title: 'Fire Extinguisher Refill', category: 'Safety', status: 'completed', date: '2023-10-15', priority: 'high', assignee: 'Safety Inc', location: 'All Floors' },
];

const categoryIcons = {
  Electrical: Zap,
  Plumbing: Droplets,
  HVAC: Wrench,
  Maintenance: Hammer,
  Safety: AlertTriangle,
};

export default function Tasks() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '', category: 'Electrical', location: '', assignee: '', date: '', priority: 'low', status: 'pending'
  });

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || task.location.toLowerCase().includes(searchTerm.toLowerCase());
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
      case 'completed': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-amber-600" />;
      case 'overdue': return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      default: return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setTasks([...tasks, { ...formData, id: Date.now() }]);
      setIsSubmitting(false);
      setIsModalOpen(false);
      toast.success('Task created successfully');
      setFormData({ title: '', category: 'Electrical', location: '', assignee: '', date: '', priority: 'low', status: 'pending' });
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance Tasks</h1>
          <p className="text-slate-500 mt-1">Track and manage all facility maintenance activities</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map(task => {
          const Icon = categoryIcons[task.category] || Hammer;
          return (
            <div key={task.id} className={`flex flex-col bg-white rounded-2xl border-2 transition-all hover:shadow-lg ${
              task.status === 'overdue' ? 'border-rose-100 hover:border-rose-300' :
              task.status === 'pending' ? 'border-amber-100 hover:border-amber-300' :
              'border-emerald-100 hover:border-emerald-300'
            }`}>
              <div className={`p-5 rounded-t-2xl border-b ${getStatusColor(task.status)} bg-opacity-30`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 font-semibold capitalize">
                    {getStatusIcon(task.status)}
                    {task.status}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white bg-opacity-50 rounded-full">
                    {task.priority.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{task.title}</h3>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <div className="p-1.5 bg-slate-100 rounded-lg"><Icon className="w-4 h-4 text-slate-700" /></div>
                    {task.category}
                  </div>
                  <span className="text-slate-500 font-medium">{task.location}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                      {task.assignee.split(' ').map(n=>n[0]).join('').substring(0,2)}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{task.assignee}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">
                    {new Date(task.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Task">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Safety">Safety</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <input required type="text" value={formData.assignee} onChange={e => setFormData({...formData, assignee: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center">
              {isSubmitting ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
