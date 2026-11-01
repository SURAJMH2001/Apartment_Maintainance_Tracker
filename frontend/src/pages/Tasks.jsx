import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Plus, Clock, CheckCircle, AlertTriangle, Hammer, Droplets, Zap, Wrench } from 'lucide-react';

// Mock data for tasks
const MOCK_TASKS = [
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTasks = MOCK_TASKS.filter(task => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance Tasks</h1>
          <p className="text-slate-500 mt-1">Track and manage all facility maintenance activities</p>
        </div>
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md">
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
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
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
                      {task.assignee.split(' ').map(n=>n[0]).join('')}
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
    </div>
  );
}
